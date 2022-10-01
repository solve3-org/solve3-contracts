const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { encodeBackendProof, keccak256, encodeChainProof, signMsg, versionsHash } = require("../lib/web3-func");
const { mineBlock } = require("./lib/hardhat-func");

describe("Solve3", function () {
  async function deployVerifierFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("Token");
    const token = await tokenFactory.deploy("Solve3", "SLV");

    const solve3MasterFactory = await ethers.getContractFactory("Solve3Master");
    const solve3Master = await solve3MasterFactory.deploy();
    await solve3Master.initialize(account1.address);
    await solve3Master.setToken(token.address);

    await token.transfer(solve3Master.address, ethers.utils.parseEther("1000000"));

    const example1Factory = await ethers.getContractFactory("Example");
    const example1 = await example1Factory.deploy(solve3Master.address);

    const example2Factory = await ethers.getContractFactory("Example2");
    const example2 = await example2Factory.deploy(solve3Master.address);

    return { verifier: solve3Master, example1, example2, owner, account1, account2, account3, token };
  }

  let verifier, example1, example2, owner, account1, account2, account3, token;

  beforeEach(async function () {
    ({ verifier, example1, example2, owner, account1, account2, account3, token } = await loadFixture(
      deployVerifierFixture
    ));
  });

  describe("Master", function () {

    it("should have the right owner", async () => {
      expect(await verifier.owner()).to.equal(owner.address);
    })

    it("should fail when try to initialize a second time", async () => {
      await expect(verifier.initialize(account1.address)).to.be.revertedWith("Initializable: contract is already initialized");
    })

    it("should return the right nonce", async function () {
      const timestampAndNonce = await verifier.getTimestampAndNonce(account2.address);
      expect(timestampAndNonce[1]).to.equal(0);
    })

    it("should return true for signer", async function () {
      const isSigner = await verifier.isSigner(account1.address);
      expect(isSigner).to.equal(true);
    })

    it("should return false for non-signer", async function () {
      const isSigner = await verifier.isSigner(account2.address);
      expect(isSigner).to.equal(false);
    })

    it("should verify the message correct", async () => {
      let version = versionsHash(0);

      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      
      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: owner.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      const isVerified = await verifier.callStatic.verifyProof(version, proof);

      expect(isVerified[2]).to.equal(true);
    })

    it.only("should verify the message correct", async () => {
      let version = versionsHash(0);
      console.log("version", version);
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      var m = {
        "account": "0x1688C68f136F59643C8a8a66023D814e0bee6937",
        "contract": "0xf43c980768CD390015e269ba06cB145fD440DefB",
        "timestamp": 0x63121894,
        "nonce": 0,
        "ad": '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'
      }

      const ad = await verifier.getId("");
      console.log(ad)
      // const encoded = await encodeBackendProof({ account: account2.address, contract: owner.address, timestamp, nonce, ad: ad });
      const encoded = await encodeBackendProof(m);
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: m.nonce,
          timestamp: m.timestamp,
          account: m.account,
          ad: ad,
        }
      )
        console.log(proof)
      await mineBlock();

      const isVerified = await verifier.callStatic.verifyProof(version, proof);

      expect(isVerified[2]).to.equal(true);
    })

    it("should verify the message incorrect with wrong value", async () => {
      let version = versionsHash(0);

      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: owner.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof0 = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account1.address, // wrong address
          ad: ad,
        }
      )

      const proof1 = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: 11111111, // wrong timestamp
          account: account2.address,
          ad: ad,
        }
      )

      const proof2 = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: 9999,  // wrong nonce
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();
      //wrong account
      let isVerified = await verifier.callStatic.verifyProof(version, proof0)
      expect(isVerified[2]).to.equal(false);
      //wrong timestamp
      isVerified = await verifier.callStatic.verifyProof(version, proof1);
      expect(isVerified[2]).to.equal(false);
      //wrong nonce
      isVerified = await verifier.callStatic.verifyProof(version, proof2);
      expect(isVerified[2]).to.equal(false);
    })

    it("should increment nonce", async () => {
      let version = versionsHash(0);

      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: owner.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      await verifier.verifyProof(version, proof);

      tsNonce = await verifier.getTimestampAndNonce(account2.address);
      nonce = tsNonce[1];

      expect(nonce).to.equal(1);
    })
  })

  describe("Verify - Example", function () {

    it("should have the correct owner", async () => {
      expect(await example1.owner()).to.equal(owner.address);
    })

    it("should have number == 0", async () => {
      expect(await example1.number()).to.equal(0);
    })

    it("should fail when try to set number when solve3 is enabled", async () => {
      await expect(example1.setNumber2(1)).to.be.revertedWith("Solution3Verify: Verification is not disabled")
    })

    it("should success when try to set number when solve3 is disabled", async () => {
      await example1.disableSolve3(true);
      await example1.setNumber2(1);
      expect(await example1.number()).to.eq(1)
    })

    it("should be able to set number with signed message", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      await example1.connect(account2).setNumber(proof, 2);
      expect(await example1.number()).to.eq(2)
    })

    it("should fail to set number with wrong timestamp or nonce", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof0 = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp + 1,
          account: account2.address,
          ad: ad,
        }
      )

      const proof1 = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce + 1,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      await expect(example1.connect(account2).setNumber(proof0, 2)).to.be.revertedWith("Solve3Verify: Unable to verify message");
      await expect(example1.connect(account2).setNumber(proof1, 2)).to.be.revertedWith("Solve3Verify: Unable to verify message");

      it("should fail to set number when using two times same msg", async () => {
        let timestamp, nonce;
        let tsNonce = await verifier.getTimestampAndNonce(account2.address);

        timestamp = tsNonce[0];
        nonce = tsNonce[1];

        const ad = await verifier.getId("0x");
        const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
        const msg = await keccak256(encoded);
        const sig = await signMsg(account1, msg);

        const proof = encodeChainProof(
          {
            s: sig.s,
            r: sig.r,
            v: sig.v,
            nonce: nonce,
            timestamp: timestamp,
            account: account2.address,
            ad: ad,
          }
        )

        await mineBlock();

        await example1.connect(account2).setNumber(proof, 2);
        expect(await example1.number()).to.eq(2)

        await expect(example1.connect(account2).setNumber(proof, 2)).to.be.revertedWith("Solve3Verify: Unable to verify message");
      })

      it("should fail to set number when increasing time by 6min", async () => {
        let timestamp, nonce;
        let tsNonce = await verifier.getTimestampAndNonce(account2.address);

        timestamp = tsNonce[0];
        nonce = tsNonce[1];

        const ad = await verifier.getId("0x");
        const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
        const msg = await keccak256(encoded);
        const sig = await signMsg(account1, msg);

        const proof = encodeChainProof(
          {
            s: sig.s,
            r: sig.r,
            v: sig.v,
            nonce: nonce,
            timestamp: timestamp,
            account: account2.address,
            ad: ad,
          }
        )

        await mineBlock();

        let min = 60;

        await ethers.provider.send('evm_increaseTime', [6 * min]);
        await ethers.provider.send('evm_mine');

        await expect(example1.connect(account2).setNumber(proof, 2)).to.be.revertedWith("Solve3Verify: Signature is no longer valid");
      })

      it("should success when increasing time by 6min after increasing validPeriod", async () => {
        let timestamp, nonce;
        let tsNonce = await verifier.getTimestampAndNonce(account2.address);

        timestamp = tsNonce[0];
        nonce = tsNonce[1];

        const ad = await verifier.getId("0x");
        const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
        const msg = await keccak256(encoded);
        const sig = await signMsg(account1, msg);

        const proof = encodeChainProof(
          {
            s: sig.s,
            r: sig.r,
            v: sig.v,
            nonce: nonce,
            timestamp: timestamp,
            account: account2.address,
            ad: ad,
          }
        )

        await mineBlock();

        let min = 60;

        await example1.set((await example1.validFromTimestamp()), 7 * min);

        await ethers.provider.send('evm_increaseTime', [6 * min]);
        await ethers.provider.send('evm_mine');

        await expect(example1.connect(account2).setNumber(proof, 2)).to.be.revertedWith("Solve3Verify: Signature is no longer valid");
      })

      it("should fail to set number when timestamp in future", async () => {
        let timestamp, nonce;
        let tsNonce = await verifier.getTimestampAndNonce(account2.address);

        timestamp = tsNonce[0] + 1000000;
        nonce = tsNonce[1];

        const ad = await verifier.getId("0x");
        const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
        const msg = await keccak256(encoded);
        const sig = await signMsg(account1, msg);

        const proof = encodeChainProof(
          {
            s: sig.s,
            r: sig.r,
            v: sig.v,
            nonce: nonce,
            timestamp: timestamp,
            account: account2.address,
            ad: ad,
          }
        )

        await mineBlock();

        await expect(example1.connect(account2).setNumber(proof, 3)).to.be.revertedWith("Solve3Verify: Unable to verify message");
      })

      it("should fail to set number when msg was signed too early", async () => {
        let timestamp, nonce;
        let tsNonce = await verifier.getTimestampAndNonce(account2.address);

        timestamp = tsNonce[0] - 1000;
        nonce = tsNonce[1];

        const ad = await verifier.getId("0x");
        const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
        const msg = await keccak256(encoded);
        const sig = await signMsg(account1, msg);

        const proof = encodeChainProof(
          {
            s: sig.s,
            r: sig.r,
            v: sig.v,
            nonce: nonce,
            timestamp: timestamp,
            account: account2.address,
            ad: ad,
          }
        )

        await mineBlock();

        await expect(example1.connect(account2).setNumber(proof, 3)).to.be.revertedWith("Solve3Verify: Unable to verify message");
      })

      it("should success when msg was signed early after changing validFromTimestamp", async () => {
        let timestamp, nonce;
        let tsNonce = await verifier.getTimestampAndNonce(account2.address);

        timestamp = tsNonce[0] - 1000;
        nonce = tsNonce[1];

        const ad = await verifier.getId("0x");
        const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
        const msg = await keccak256(encoded);
        const sig = await signMsg(account1, msg);

        const proof = encodeChainProof(
          {
            s: sig.s,
            r: sig.r,
            v: sig.v,
            nonce: nonce,
            timestamp: timestamp,
            account: account2.address,
            ad: ad,
          }
        )

        await example1.set((await example1.validFromTimestamp() - 10000), 30000);

        await mineBlock();

        await example1.connect(account2).setNumber(proof, 3)
        expect(await example1.number()).to.eq(3)
      })
    })

  })

  describe("Verify - Example2", function () {
    it("should success when validFrom() returns timestamp from past", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: example2.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      await example2.toggleIt()

      await example2.connect(account2).setNumber(proof, 4);
      expect(await example2.number()).to.eq(4)
    })

    it("should fail when validFrom() returns timestamp from future", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: example2.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();
      await expect(example2.connect(account2).setNumber(proof, 4)).to.be.revertedWith("Solve3Verify: Message was signed too early");
    })

    it("should fail to set number when increasing time by 100s", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = await verifier.getId("0x");
      const encoded = await encodeBackendProof({ account: account2.address, contract: example2.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      await example2.toggleIt()

      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');

      await expect(example2.connect(account2).setNumber(proof, 3)).to.be.revertedWith("Solve3Verify: Message was signed too early");
    })

  })

  describe("Master - Ads", function () {

    let _ID = "0x02b95aae64d92daf4dc7a044b7fa8362dfed496017a7352fe6864dba0faff72c";
    
    beforeEach(async () => {
      await token.approve(verifier.address, ethers.utils.parseEther("100000000000000"));
      await verifier.addAd(owner.address, "ABCDEFG", 2, "20000000000000000");
    })

    it("should have added a new ad", async () => {
      expect(await verifier.getAdSet()).to.have.lengthOf(1);
      let id = (await verifier.getAdSet())[0]
      let ad = await verifier.getAd(id);

      expect(ad[0]).to.eq(id);
      expect(ad[1]).to.eq(owner.address);
      expect(ad[2]).to.eq("ABCDEFG");
      expect(ad[3]).to.eq(2);
      expect(ad[4]).to.eq("20000000000000000");
    })

    it("should transfer token and decrease totalSolves", async () => {

      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const ad = _ID
      const encoded = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
      const msg = await keccak256(encoded);
      const sig = await signMsg(account1, msg);

      const proof = encodeChainProof(
        {
          s: sig.s,
          r: sig.r,
          v: sig.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();

      let balanceVerifier = await token.balanceOf(verifier.address);
      let balanceAcc2 = await token.balanceOf(account2.address);

      expect(balanceAcc2).to.eq(0);

      await example1.connect(account2).setNumber(proof, 2);
      expect(await example1.number()).to.eq(2)

      let balanceVerifierAfter = await token.balanceOf(verifier.address);
      let balanceAcc2After = await token.balanceOf(account2.address);

      expect(balanceAcc2After).to.eq("20000000000000000")
      expect(balanceVerifier.sub(balanceVerifierAfter)).to.eq("20000000000000000")
      
      let adI = await verifier.getAd(_ID);

      expect(adI[0]).to.eq(_ID);
      expect(adI[1]).to.eq(owner.address);
      expect(adI[2]).to.eq("ABCDEFG");
      expect(adI[3]).to.eq(1);
      expect(adI[4]).to.eq("20000000000000000");


      tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const encoded2 = await encodeBackendProof({ account: account2.address, contract: example1.address, timestamp, nonce, ad: ad });
      const msg2 = await keccak256(encoded2);
      const sig2 = await signMsg(account1, msg2);

      const proof2 = encodeChainProof(
        {
          s: sig2.s,
          r: sig2.r,
          v: sig2.v,
          nonce: nonce,
          timestamp: timestamp,
          account: account2.address,
          ad: ad,
        }
      )

      await mineBlock();
     await example1.connect(account2).setNumber(proof2, 2);
      
     expect(await verifier.getAdSet()).to.have.lengthOf(0);
    })
   })
})