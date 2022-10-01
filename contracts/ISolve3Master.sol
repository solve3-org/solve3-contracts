//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

interface ISolve3Master {

    struct ProofV0 {
        bytes32 s;
        bytes32 r;
        uint8 v;
        uint256 nonce;
        uint256 timestamp;
        address account;
        bytes32 ad;
    }
    
    function initialize(address _signer) external;

    function verifyProof(bytes32 version, bytes memory _proof) external returns (address account, uint256 timestamp, bool verified);

    function recoverSigner(
        address _contract,
        ProofV0 memory _proof
    ) external pure returns (address);

    function getTimestamp() external view returns (uint256);

    function getTimestampAndNonce(address _account)
        external
        view
        returns (uint256, uint256);

    function getNonce(address _account) external view returns (uint256);

    function isSigner(address _account) external view returns (bool);

    function setSigner(address _account, bool _flag) external;
}
