// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DeAsync {
    event NewTask(uint indexed taskId, address indexed requester, string funcType, string data);
    event TaskClaimed(uint indexed taskId, address indexed worker);
    event TaskCompleted(uint indexed taskId, string result);
    
    struct Task {
        uint id;
        address requester;
        address worker;
        string funcType;
        string data;
        string result;
        bool completed;
        uint reward;
    }
    
    uint public taskCount;
    mapping(uint => Task) public tasks;
    mapping(address => uint) public balances;
    
    function submitTask(string memory funcType, string memory data) public payable {
        taskCount++;
        tasks[taskCount] = Task({
            id: taskCount,
            requester: msg.sender,
            worker: address(0),
            funcType: funcType,
            data: data,
            result: "",
            completed: false,
            reward: msg.value
        });
        
        emit NewTask(taskCount, msg.sender, funcType, data);
    }
    
    function claimTask(uint taskId) public {
        require(taskId <= taskCount, "Invalid task ID");
        require(tasks[taskId].worker == address(0), "Task already claimed");
        require(!tasks[taskId].completed, "Task already completed");
        
        tasks[taskId].worker = msg.sender;
        emit TaskClaimed(taskId, msg.sender);
    }
    
    function submitResult(uint taskId, string memory result) public {
        require(taskId <= taskCount, "Invalid task ID");
        require(tasks[taskId].worker == msg.sender, "Not the assigned worker");
        require(!tasks[taskId].completed, "Task already completed");
        
        tasks[taskId].result = result;
        tasks[taskId].completed = true;
        
        // Transfer reward to worker
        if (tasks[taskId].reward > 0) {
            balances[msg.sender] += tasks[taskId].reward;
        }
        
        emit TaskCompleted(taskId, result);
    }
    
    function withdrawBalance() public {
        uint amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
    
    function getTask(uint taskId) public view returns (Task memory) {
        return tasks[taskId];
    }
    
    function getLatestTasks(uint count) public view returns (Task[] memory) {
        uint start = taskCount > count ? taskCount - count + 1 : 1;
        Task[] memory latestTasks = new Task[](taskCount >= start ? taskCount - start + 1 : 0);
        
        for (uint i = start; i <= taskCount; i++) {
            latestTasks[i - start] = tasks[i];
        }
        
        return latestTasks;
    }
}
