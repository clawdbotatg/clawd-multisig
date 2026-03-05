// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/MetaMultiSigWallet.sol";
import "./DeployHelpers.s.sol";

contract DeployMetaMultiSigWallet is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        address[] memory owners = new address[](3);
        owners[0] = 0x09defC9E6ffc5e41F42e0D50512EEf9354523E0E; // AI Agent
        owners[1] = 0x34aA3F359A9D614239015126635CE7732c18fDF3; // Hot wallet (atg.eth)
        owners[2] = 0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0; // Cold wallet

        MetaMultiSigWallet wallet = new MetaMultiSigWallet(block.chainid, owners, 2);
        console.logString(string.concat("MetaMultiSigWallet deployed at: ", vm.toString(address(wallet))));
    }
}
