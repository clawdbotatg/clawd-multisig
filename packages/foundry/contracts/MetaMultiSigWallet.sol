// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MetaMultiSigWallet {
    using MessageHashUtils for bytes32;

    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event ExecuteTransaction(
        address indexed owner,
        address payable to,
        uint256 value,
        bytes data,
        uint256 nonce,
        bytes32 hash,
        bytes result
    );
    event Owner(address indexed owner, bool added);

    mapping(address => bool) public isOwner;
    uint256 public signaturesRequired;
    uint256 public nonce;
    uint256 public chainId;

    constructor(uint256 _chainId, address[] memory _owners, uint256 _signaturesRequired) {
        require(_signaturesRequired > 0, "must be non-zero sigs required");
        signaturesRequired = _signaturesRequired;
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "zero address");
            require(!isOwner[owner], "owner not unique");
            isOwner[owner] = true;
            emit Owner(owner, true);
        }
        chainId = _chainId;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "Not Self");
        _;
    }

    function addSigner(address newSigner, uint256 newSignaturesRequired) public onlySelf {
        require(newSigner != address(0), "zero address");
        require(!isOwner[newSigner], "owner not unique");
        require(newSignaturesRequired > 0, "must be non-zero sigs required");
        isOwner[newSigner] = true;
        signaturesRequired = newSignaturesRequired;
        emit Owner(newSigner, true);
    }

    function removeSigner(address oldSigner, uint256 newSignaturesRequired) public onlySelf {
        require(isOwner[oldSigner], "not owner");
        require(newSignaturesRequired > 0, "must be non-zero sigs required");
        isOwner[oldSigner] = false;
        signaturesRequired = newSignaturesRequired;
        emit Owner(oldSigner, false);
    }

    function updateSignaturesRequired(uint256 newSignaturesRequired) public onlySelf {
        require(newSignaturesRequired > 0, "must be non-zero sigs required");
        signaturesRequired = newSignaturesRequired;
    }

    function getTransactionHash(
        uint256 _nonce,
        address to,
        uint256 value,
        bytes memory data
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data));
    }

    function executeTransaction(
        address payable to,
        uint256 value,
        bytes memory data,
        bytes[] memory signatures
    ) public returns (bytes memory) {
        require(isOwner[msg.sender], "only owners can execute");
        bytes32 _hash = getTransactionHash(nonce, to, value, data);
        nonce++;
        uint256 validSignatures;
        address duplicateGuard;
        for (uint256 i = 0; i < signatures.length; i++) {
            address recovered = recover(_hash, signatures[i]);
            require(recovered > duplicateGuard, "duplicate or unordered signatures");
            duplicateGuard = recovered;
            if (isOwner[recovered]) validSignatures++;
        }
        require(validSignatures >= signaturesRequired, "not enough valid signatures");
        (bool success, bytes memory result) = to.call{ value: value }(data);
        require(success, "tx failed");
        emit ExecuteTransaction(msg.sender, to, value, data, nonce - 1, _hash, result);
        return result;
    }

    function recover(bytes32 _hash, bytes memory _signature) public pure returns (address) {
        return ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(_hash), _signature);
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
}
