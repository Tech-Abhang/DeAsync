const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeAsync Contract", function () {
  let DeAsync;
  let deAsync;
  let owner;
  let worker1;
  let worker2;
  let requester;

  beforeEach(async function () {
    // Get signers
    [owner, worker1, worker2, requester] = await ethers.getSigners();

    // Deploy contract
    DeAsync = await ethers.getContractFactory("DeAsync");
    deAsync = await DeAsync.deploy();
    await deAsync.deployed();

    console.log(`Contract deployed to: ${deAsync.address}`);
  });

  describe("Contract Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(deAsync.address).to.not.be.undefined;
    });

    it("Should initialize with zero task count", async function () {
      expect(await deAsync.taskCount()).to.equal(0);
    });
  });

  describe("Task Submission", function () {
    it("Should submit a task successfully", async function () {
      const funcType = "javascript";
      const data = JSON.stringify({ func: "(x) => x * 2", input: 42 });
      const reward = ethers.utils.parseEther("0.1");

      await expect(
        deAsync.connect(requester).submitTask(funcType, data, { value: reward })
      )
        .to.emit(deAsync, "NewTask")
        .withArgs(1, requester.address, funcType, data);

      expect(await deAsync.taskCount()).to.equal(1);
    });

    it("Should store task data correctly", async function () {
      const funcType = "javascript";
      const data = JSON.stringify({ func: "(x) => x * 2", input: 42 });
      const reward = ethers.utils.parseEther("0.1");

      await deAsync.connect(requester).submitTask(funcType, data, { value: reward });

      const task = await deAsync.getTask(1);
      expect(task.id).to.equal(1);
      expect(task.requester).to.equal(requester.address);
      expect(task.funcType).to.equal(funcType);
      expect(task.data).to.equal(data);
      expect(task.reward).to.equal(reward);
      expect(task.completed).to.be.false;
    });

    it("Should allow multiple task submissions", async function () {
      const reward = ethers.utils.parseEther("0.1");

      await deAsync.connect(requester).submitTask("javascript", "task1", { value: reward });
      await deAsync.connect(requester).submitTask("javascript", "task2", { value: reward });

      expect(await deAsync.taskCount()).to.equal(2);
    });
  });

  describe("Task Claiming", function () {
    beforeEach(async function () {
      // Submit a task first
      const reward = ethers.utils.parseEther("0.1");
      await deAsync.connect(requester).submitTask("javascript", "test task", { value: reward });
    });

    it("Should allow worker to claim unclaimed task", async function () {
      await expect(deAsync.connect(worker1).claimTask(1))
        .to.emit(deAsync, "TaskClaimed")
        .withArgs(1, worker1.address);

      const task = await deAsync.getTask(1);
      expect(task.worker).to.equal(worker1.address);
    });

    it("Should prevent claiming already claimed task", async function () {
      await deAsync.connect(worker1).claimTask(1);

      await expect(
        deAsync.connect(worker2).claimTask(1)
      ).to.be.revertedWith("Task already claimed");
    });

    it("Should prevent claiming non-existent task", async function () {
      await expect(
        deAsync.connect(worker1).claimTask(999)
      ).to.be.revertedWith("Invalid task ID");
    });
  });

  describe("Result Submission", function () {
    beforeEach(async function () {
      // Submit and claim a task
      const reward = ethers.utils.parseEther("0.1");
      await deAsync.connect(requester).submitTask("javascript", "test task", { value: reward });
      await deAsync.connect(worker1).claimTask(1);
    });

    it("Should allow assigned worker to submit result", async function () {
      const result = JSON.stringify({ result: 84 });

      await expect(deAsync.connect(worker1).submitResult(1, result))
        .to.emit(deAsync, "TaskCompleted")
        .withArgs(1, result);

      const task = await deAsync.getTask(1);
      expect(task.result).to.equal(result);
      expect(task.completed).to.be.true;
    });

    it("Should prevent non-assigned worker from submitting result", async function () {
      await expect(
        deAsync.connect(worker2).submitResult(1, "fake result")
      ).to.be.revertedWith("Not the assigned worker");
    });

    it("Should prevent submitting result for completed task", async function () {
      await deAsync.connect(worker1).submitResult(1, "first result");

      await expect(
        deAsync.connect(worker1).submitResult(1, "second result")
      ).to.be.revertedWith("Task already completed");
    });

    it("Should update worker balance after result submission", async function () {
      const initialBalance = await deAsync.balances(worker1.address);
      const reward = ethers.utils.parseEther("0.1");

      await deAsync.connect(worker1).submitResult(1, "result");

      const finalBalance = await deAsync.balances(worker1.address);
      expect(finalBalance.sub(initialBalance)).to.equal(reward);
    });
  });

  describe("Balance Withdrawal", function () {
    beforeEach(async function () {
      // Submit, claim, and complete a task to generate balance
      const reward = ethers.utils.parseEther("0.1");
      await deAsync.connect(requester).submitTask("javascript", "test task", { value: reward });
      await deAsync.connect(worker1).claimTask(1);
      await deAsync.connect(worker1).submitResult(1, "result");
    });

    it("Should allow worker to withdraw earned balance", async function () {
      const balance = await deAsync.balances(worker1.address);
      const initialEthBalance = await worker1.getBalance();

      const tx = await deAsync.connect(worker1).withdrawBalance();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const finalEthBalance = await worker1.getBalance();
      const expectedBalance = initialEthBalance.add(balance).sub(gasUsed);

      expect(finalEthBalance).to.equal(expectedBalance);
      expect(await deAsync.balances(worker1.address)).to.equal(0);
    });

    it("Should prevent withdrawal when no balance", async function () {
      await expect(
        deAsync.connect(worker2).withdrawBalance()
      ).to.be.revertedWith("No balance to withdraw");
    });
  });

  describe("Task Retrieval", function () {
    it("Should get latest tasks correctly", async function () {
      const reward = ethers.utils.parseEther("0.1");

      // Submit multiple tasks
      await deAsync.connect(requester).submitTask("javascript", "task1", { value: reward });
      await deAsync.connect(requester).submitTask("javascript", "task2", { value: reward });
      await deAsync.connect(requester).submitTask("javascript", "task3", { value: reward });

      const latestTasks = await deAsync.getLatestTasks(2);
      expect(latestTasks.length).to.equal(2);
      expect(latestTasks[0].id).to.equal(2); // Second task
      expect(latestTasks[1].id).to.equal(3); // Third task
    });

    it("Should handle getting more tasks than exist", async function () {
      const reward = ethers.utils.parseEther("0.1");
      await deAsync.connect(requester).submitTask("javascript", "task1", { value: reward });

      const latestTasks = await deAsync.getLatestTasks(5);
      expect(latestTasks.length).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero reward tasks", async function () {
      await expect(
        deAsync.connect(requester).submitTask("javascript", "free task", { value: 0 })
      ).to.not.be.reverted;

      const task = await deAsync.getTask(1);
      expect(task.reward).to.equal(0);
    });

    it("Should handle empty data", async function () {
      const reward = ethers.utils.parseEther("0.1");
      
      await expect(
        deAsync.connect(requester).submitTask("javascript", "", { value: reward })
      ).to.not.be.reverted;
    });
  });

  describe("Gas Usage Tests", function () {
    it("Should measure gas for task submission", async function () {
      const reward = ethers.utils.parseEther("0.1");
      const data = JSON.stringify({ func: "(x) => x * 2", input: 42 });

      const tx = await deAsync.connect(requester).submitTask("javascript", data, { value: reward });
      const receipt = await tx.wait();
      
      console.log(`Task submission gas used: ${receipt.gasUsed}`);
      expect(receipt.gasUsed).to.be.below(100000); // Should use less than 100k gas
    });

    it("Should measure gas for task completion", async function () {
      const reward = ethers.utils.parseEther("0.1");
      await deAsync.connect(requester).submitTask("javascript", "test", { value: reward });
      await deAsync.connect(worker1).claimTask(1);

      const tx = await deAsync.connect(worker1).submitResult(1, "result");
      const receipt = await tx.wait();
      
      console.log(`Result submission gas used: ${receipt.gasUsed}`);
      expect(receipt.gasUsed).to.be.below(80000); // Should use less than 80k gas
    });
  });
});
