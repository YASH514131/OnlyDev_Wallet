// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title HelloWorld
 * @dev Simple contract to test wallet deployment
 */
contract HelloWorld {
    string public message;
    address public owner;
    uint256 public counter;
    
    event MessageUpdated(string newMessage, address updatedBy);
    event CounterIncremented(uint256 newCount);
    
    constructor() {
        message = "Hello from TestNet Wallet!";
        owner = msg.sender;
        counter = 0;
    }
    
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
        emit MessageUpdated(_newMessage, msg.sender);
    }
    
    function getMessage() public view returns (string memory) {
        return message;
    }
    
    function incrementCounter() public {
        counter += 1;
        emit CounterIncremented(counter);
    }
    
    function getCounter() public view returns (uint256) {
        return counter;
    }
}
