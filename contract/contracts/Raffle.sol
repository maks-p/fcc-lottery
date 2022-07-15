// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol';

error Raffle__InsufficientEntranceFee();
error Raffle_TransferFailed();
error Raffle__RaffleNotOpen();
error Raffle__UpkeepNotNeeded(uint256 balance, uint256 numPlayers, uint256 raffleState);

/** @title Sample Raffle Contract
  * @author Patrick Collins, as modified by Maks Pazuniak
  * @notice This contract is for creating a sample raffle contract
  * @dev This implements the Chainlink VRF Version 2 
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {

  enum RaffleState {
    OPEN,
    CALCULATING
  }

  uint256 private immutable entranceFee;
  address payable[] private players;
  VRFCoordinatorV2Interface private immutable vrfCoordinator;
  bytes32 private immutable gasLane;
  uint64 private immutable subscriptionId;
  uint32 private immutable callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  address private recentWinner;
  RaffleState private raffleState;
  uint256 private lastTimestamp;
  uint256 private immutable raffleInterval;
  
  event RaffleEnter (address indexed player);
  event RequestedRaffleWinner (uint256 indexed requestId);
  event WinnerPicked (address indexed winner);

  constructor(
    address _vrfCoordinatorV2, 
    uint256 _entranceFee, 
    bytes32 _gasLane, 
    uint64 _subscriptionId, 
    uint32 _callbackGasLimit, 
    uint256 _raffleInterval
  ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
    entranceFee = _entranceFee;
    vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
    gasLane = _gasLane;
    subscriptionId = _subscriptionId;
    callbackGasLimit = _callbackGasLimit;
    raffleState = RaffleState.OPEN;
    lastTimestamp = block.timestamp;
    raffleInterval = _raffleInterval;
  }

  function enterRaffle() public payable {
    if (msg.value < entranceFee) {
      revert Raffle__InsufficientEntranceFee();
    }

    if (raffleState != RaffleState.OPEN) {
      revert Raffle__RaffleNotOpen();
    }

    players.push(payable(msg.sender));

    emit RaffleEnter(msg.sender);
  }

  /**
    * @dev This is the function that the Chainlink Keeper nodes call
    * They look for the `upkeepNeeded` to return true 
    * The following should be true in order to return true:
    * 1. Our time interval should have passed
    * 2. The lottery should have at least 1 player and have some ETH
    * 3. The subscription is funded with LINK
    * 4. The lottery should be in an "open" state
    */
  function checkUpkeep(bytes memory /* checkData */) public view override returns (bool upkeepNeeded, bytes memory /* performData */){
    bool isOpen = RaffleState.OPEN == raffleState;
    bool timePassed = ((block.timestamp - lastTimestamp) > raffleInterval);
    bool hasPlayers = players.length > 0;
    bool hasBalance = address(this).balance > 0;

    upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
  }

  function performUpkeep(bytes calldata /* performData */) external override {
    (bool upkeepNeeded, ) = checkUpkeep('');

    if (!upkeepNeeded) {
      revert Raffle__UpkeepNotNeeded(address(this).balance, players.length, uint256(raffleState));
    }
    raffleState = RaffleState.CALCULATING;

    uint256 requestId = vrfCoordinator.requestRandomWords(
      gasLane,
      subscriptionId,
      REQUEST_CONFIRMATIONS,
      callbackGasLimit,
      NUM_WORDS
    );

    emit RequestedRaffleWinner(requestId);
  }

  function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
    uint256 indexOfWinner = randomWords[0] % players.length;
    address payable winner = players[indexOfWinner];
    recentWinner = winner;
    raffleState = RaffleState.OPEN;
    players = new address payable[](0);
    lastTimestamp = block.timestamp;

    (bool success, ) = winner.call{value: address(this).balance}("");

    if (!success) {
      revert Raffle_TransferFailed();
    }
    emit WinnerPicked(winner);
  }

  function getEntranceFee() public view returns (uint256) {
    return entranceFee;
  }

  function getPlayer(uint256 idx) public view returns (address) {
    return players[idx];
  }

  function getRecentWinner() public view returns (address) {
    return recentWinner;
  }

  function getRaffleState() public view returns (RaffleState) {
        return raffleState;
    }

  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return players.length;
  }

  function getLastTimestamp() public view returns (uint256) {
    return lastTimestamp;
  }

  function getRequestConfirmations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }

  function getInterval() public view returns (uint256) {
    return raffleInterval;
  }
}