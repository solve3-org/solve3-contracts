//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "./ISolve3Master.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Solve3Master is ISolve3Master, Initializable, OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    IERC20 public token;

    struct Ad {
        bytes32 id;
        address creator;
        string ipfs;
        uint256 totalSolves;
        uint256 amountPerSolve;
    }

    mapping(address => uint256) public nonces;
    mapping(address => bool) public signer;
    mapping(bytes32 => Ad) public ads;
    uint256 public noAdAmount;

    EnumerableSet.Bytes32Set private adSet;

    function initialize(address _signer) public override initializer {
        __Ownable_init();
        _setSigner(_signer, true);
        noAdAmount = 0;
    }

    function addAd(
        address _creator,
        string memory _ipfs,
        uint256 _totalSolves,
        uint256 _amountPerSolve
    ) external onlyOwner {
        require(_totalSolves > 0, "Total solves must be greater than 0");
        require(_amountPerSolve > 0, "Amount per solve must be greater than 0");

        bytes32 identifier = keccak256(abi.encodePacked(_ipfs));

        require(
            ads[identifier].creator == address(0),
            "Ad already exists or wrong creator"
        );

        token.safeTransferFrom(
            msg.sender,
            address(this),
            _amountPerSolve * _totalSolves
        );

        Ad storage ad = ads[identifier];

        // todo add multiple ads with one ipfs hash
        ad.id = identifier;
        ad.creator = _creator;
        ad.ipfs = _ipfs;
        ad.totalSolves = _totalSolves;
        ad.amountPerSolve = _amountPerSolve;

        adSet.add(identifier);

        emit AdAdded(
            identifier,
            _creator,
            _ipfs,
            _totalSolves,
            _amountPerSolve
        );
    }

    function removeAd(bytes32 _id) external onlyOwner {
        require(adSet.contains(_id), "Ad does not exist");

        Ad storage ad = ads[_id];
        token.safeTransfer(msg.sender, ad.totalSolves * ad.amountPerSolve);

        delete ads[_id];
        adSet.remove(_id);

        emit AdRemoved(_id);
    }
    // _data:
    // s,r,v,nonce,timestamp,account,ad
    // bytes32,bytes32,uint8,uint256,uint256,address,bytes32
    function verifyProof(bytes32 _version, bytes memory _proof)
        public
        override
        returns (
            address,
            uint256,
            bool
        )
    {
        require(
            _version == keccak256(abi.encodePacked("SOLVE3.V0")),
            "Solve3Master: Wrong version (0)"
        );
        require(_proof.length == 224, "Solve3Master: Invalid proof length");
        ProofV0 memory proof = abi.decode(_proof, (ProofV0));

        bool verified = false;
        address signerAddress = recoverSigner(msg.sender, proof);

        if (
            nonces[proof.account] == proof.nonce &&
            proof.timestamp < block.timestamp &&
            signer[signerAddress]
        ) {
            verified = true;
        }

        if (verified) {
            nonces[proof.account]++;
            if (address(token) != address(0))
                _transferToken(proof.account, proof.ad);
        }

        return (proof.account, proof.timestamp, verified);
    }

    function _transferToken(address _account, bytes32 _ad) internal {
        Ad storage ad = ads[bytes32(_ad)];
        uint256 transferAmount = 0;

        if (ad.totalSolves > 0) {
            transferAmount = ad.amountPerSolve;
            ad.totalSolves -= 1;
            if (ad.totalSolves == 0) {
                delete ads[_ad];
                adSet.remove(_ad);
            }
        } else {
            transferAmount = noAdAmount;
        }
        if (
            token.balanceOf(address(this)) >= transferAmount &&
            transferAmount > 0
        ) {
            token.safeTransfer(_account, transferAmount);
        }
    }

    function getTokenAmount(bytes32 _id) public view returns (uint256) {
        Ad storage ad = ads[_id];
        if (ad.totalSolves > 0) {
            return ad.amountPerSolve;
        } else {
            return noAdAmount;
        }
    }

    function recoverSigner(address _contract, ProofV0 memory _proof)
        public
        pure
        override
        returns (address)
    {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                prefix,
                createMessage(
                    _proof.nonce,
                    _proof.timestamp,
                    _contract,
                    _proof.account,
                    _proof.ad
                )
            )
        );
        return ecrecover(prefixedHashMessage, _proof.v, _proof.r, _proof.s);
    }

    function createMessage(
        uint256 _nonce,
        uint256 _timestamp,
        address _contract,
        address _account,
        bytes32 _ad
    ) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(_nonce, _timestamp, _contract, _account, _ad));
    }

    function getTimestamp() external view override returns (uint256) {
        return block.timestamp;
    }

    function getTimestampAndNonce(address _account)
        external
        view
        override
        returns (uint256, uint256)
    {
        return (block.timestamp, nonces[_account]);
    }

    function getNonce(address _account)
        external
        view
        override
        returns (uint256)
    {
        return nonces[_account];
    }

    function getId(string memory _ipfs) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_ipfs));
    }

    function getAd(bytes32 _id) external view returns (Ad memory) {
        return ads[_id];
    }

    function getAdSet() external view returns (bytes32[] memory) {
        return adSet._inner._values;
    }

    function getToken() external view returns (address) {
        return address(token);
    }

    function isSigner(address _account) external view override returns (bool) {
        return signer[_account];
    }

    function setSigner(address _account, bool _flag)
        external
        override
        onlyOwner
    {
        _setSigner(_account, _flag);
    }

    function _setSigner(address _account, bool _flag) internal {
        signer[_account] = _flag;
        emit SignerChanged(_account, _flag);
    }

    function setNoAdAmount(uint256 _amount) external onlyOwner {
        noAdAmount = _amount;
        emit NoAdAmountChanged(_amount);
    }

    function setToken(address _token) external onlyOwner {
        token = IERC20(_token);
        emit TokenChanged(_token);
    }

    function recoverERC20(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, balance);
    }

    event SignerChanged(address indexed signer, bool flag);
    event AdAdded(
        bytes32 id,
        address creator,
        string ipfs,
        uint256 totalSolves,
        uint256 amountPerSolve
    );
    event AdRemoved(bytes32 id);
    event NoAdAmountChanged(uint256 amount);
    event TokenChanged(address token);
}
