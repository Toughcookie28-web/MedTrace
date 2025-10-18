import { expect } from "chai";
import { network } from "hardhat";
import type { DigitalBatch, StakeholderRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

describe("DigitalBatch", function () {
  let digitalBatch: DigitalBatch;
  let stakeholderRegistry: StakeholderRegistry;
  let owner: SignerWithAddress;
  let manufacturer1: SignerWithAddress;
  let manufacturer2: SignerWithAddress;
  let distributor: SignerWithAddress;
  let pharmacist: SignerWithAddress;
  let unregistered: SignerWithAddress;

  // Role enum values from StakeholderRegistry
  const Role = {
    None: 0,
    Manufacturer: 1,
    Distributor: 2,
    Pharmacist: 3,
  };

  // Sample IPFS URIs for testing
  const sampleTokenURIs = {
    batch1: "ipfs://QmTest123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz",
    batch2: "ipfs://QmTest999xxx888yyy777zzz666aaa555bbb444ccc333ddd222eee111",
    batch3: "ipfs://QmTestLongHash1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJ",
    empty: "",
  };

  // Helper function to deploy both contracts before each test
  async function deployContractsFixture() {
    const [
      deployer,
      mfg1,
      mfg2,
      dist,
      pharm,
      unreg,
    ] = await ethers.getSigners();

    // Deploy StakeholderRegistry first
    const registry = await ethers.deployContract("StakeholderRegistry");
    await registry.waitForDeployment();

    // Register test addresses with different roles
    await registry.connect(deployer).addStakeholder(mfg1.address, Role.Manufacturer);
    await registry.connect(deployer).addStakeholder(mfg2.address, Role.Manufacturer);
    await registry.connect(deployer).addStakeholder(dist.address, Role.Distributor);
    await registry.connect(deployer).addStakeholder(pharm.address, Role.Pharmacist);

    // Deploy DigitalBatch with StakeholderRegistry address
    const registryAddress = await registry.getAddress();
    const batch = await ethers.deployContract("DigitalBatch", [registryAddress]);
    await batch.waitForDeployment();

    return {
      batch,
      registry,
      deployer,
      mfg1,
      mfg2,
      dist,
      pharm,
      unreg,
    };
  }

  beforeEach(async function () {
    const fixture = await deployContractsFixture();
    digitalBatch = fixture.batch;
    stakeholderRegistry = fixture.registry;
    owner = fixture.deployer;
    manufacturer1 = fixture.mfg1;
    manufacturer2 = fixture.mfg2;
    distributor = fixture.dist;
    pharmacist = fixture.pharm;
    unregistered = fixture.unreg;
  });

  describe("Deployment Tests", function () {
    it("Should deploy successfully with name and symbol", async function () {
      const address = await digitalBatch.getAddress();
      expect(address).to.properAddress;
      expect(address).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct name 'PharmaLedger Batch'", async function () {
      const name = await digitalBatch.name();
      expect(name).to.equal(
        "PharmaLedger Batch",
        "Contract name should be 'PharmaLedger Batch'"
      );
    });

    it("Should have correct symbol 'PLB'", async function () {
      const symbol = await digitalBatch.symbol();
      expect(symbol).to.equal("PLB", "Contract symbol should be 'PLB'");
    });

    it("Should set correct StakeholderRegistry address", async function () {
      const registryAddress = await stakeholderRegistry.getAddress();
      const storedRegistryAddress = await digitalBatch.stakeholderRegistry();
      expect(storedRegistryAddress).to.equal(
        registryAddress,
        "StakeholderRegistry address should be correctly set"
      );
    });

    it("Should start with zero total supply", async function () {
      // Check that manufacturer has zero tokens initially
      const balance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(balance).to.equal(0n, "Initial total supply should be zero");
    });

    it("Should revert if deployed with zero address for StakeholderRegistry", async function () {
      await expect(
        ethers.deployContract("DigitalBatch", [ethers.ZeroAddress])
      ).to.be.revertedWith("Invalid StakeholderRegistry address");
    });
  });

  describe("ERC-721 Standard Compliance", function () {
    it("Should support ERC-721 interface", async function () {
      // ERC-721 interface ID: 0x80ac58cd
      const erc721InterfaceId = "0x80ac58cd";
      const supportsERC721 = await digitalBatch.supportsInterface(
        erc721InterfaceId
      );
      expect(supportsERC721).to.be.true;
    });

    it("Should support ERC-721Metadata interface", async function () {
      // ERC-721Metadata interface ID: 0x5b5e139f
      const erc721MetadataInterfaceId = "0x5b5e139f";
      const supportsMetadata = await digitalBatch.supportsInterface(
        erc721MetadataInterfaceId
      );
      expect(supportsMetadata).to.be.true;
    });

    it("Should track balanceOf correctly after minting", async function () {
      const initialBalance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(initialBalance).to.equal(0n, "Initial balance should be zero");

      // Mint a batch
      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);

      const newBalance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(newBalance).to.equal(
        1n,
        "Balance should increment to 1 after minting"
      );
    });

    it("Should track ownerOf correctly after minting", async function () {
      // Mint a batch
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      // Extract tokenId from the BatchMinted event
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      const tokenOwner = await digitalBatch.ownerOf(tokenId);
      expect(tokenOwner).to.equal(
        manufacturer1.address,
        "Token owner should be the manufacturer"
      );
    });
  });

  describe("mintBatch Function - Success Cases", function () {
    it("Should allow manufacturer to mint batch", async function () {
      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
    });

    it("Should emit BatchMinted event with correct parameters", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, sampleTokenURIs.batch1)
      )
        .to.emit(digitalBatch, "BatchMinted")
        .withArgs(1n, manufacturer1.address, sampleTokenURIs.batch1);
    });

    it("Should emit Transfer event (ERC-721 standard)", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, sampleTokenURIs.batch1)
      )
        .to.emit(digitalBatch, "Transfer")
        .withArgs(ethers.ZeroAddress, manufacturer1.address, 1n);
    });

    it("Should increment token ID sequentially (1, 2, 3...)", async function () {
      // Mint first batch
      const tx1 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      await expect(tx1)
        .to.emit(digitalBatch, "BatchMinted")
        .withArgs(1n, manufacturer1.address, sampleTokenURIs.batch1);

      // Mint second batch
      const tx2 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch2);
      await expect(tx2)
        .to.emit(digitalBatch, "BatchMinted")
        .withArgs(2n, manufacturer1.address, sampleTokenURIs.batch2);

      // Mint third batch
      const tx3 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch3);
      await expect(tx3)
        .to.emit(digitalBatch, "BatchMinted")
        .withArgs(3n, manufacturer1.address, sampleTokenURIs.batch3);
    });

    it("Should set correct token URI", async function () {
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      // Extract tokenId from the BatchMinted event
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      const tokenURI = await digitalBatch.tokenURI(tokenId);
      expect(tokenURI).to.equal(
        sampleTokenURIs.batch1,
        "Token URI should match the provided URI"
      );
    });

    it("Should assign token to manufacturer address", async function () {
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      // Extract tokenId from the BatchMinted event
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      const tokenOwner = await digitalBatch.ownerOf(tokenId);
      expect(tokenOwner).to.equal(
        manufacturer1.address,
        "Token should be assigned to manufacturer"
      );
    });

    it("Should increment manufacturer's balance", async function () {
      const initialBalance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(initialBalance).to.equal(0n);

      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);

      const newBalance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(newBalance).to.equal(1n, "Balance should increment by 1");

      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch2);

      const finalBalance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(finalBalance).to.equal(2n, "Balance should increment to 2");
    });

    it("Should allow multiple batches to be minted", async function () {
      // Mint 5 batches
      for (let i = 0; i < 5; i++) {
        await digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, `ipfs://QmTest${i}`);
      }

      const balance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(balance).to.equal(5n, "Manufacturer should have 5 tokens");
    });

    it("Should return correct token ID", async function () {
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      // Extract tokenId from the BatchMinted event
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      expect(tokenId).to.equal(1n, "First token ID should be 1");

      // Mint second batch
      const tx2 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch2);
      const receipt2 = await tx2.wait();

      const event2 = receipt2?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId2 = event2?.args?.tokenId;

      expect(tokenId2).to.equal(2n, "Second token ID should be 2");
    });
  });

  describe("mintBatch Function - Failure Cases", function () {
    it("Should revert when non-manufacturer (unregistered) tries to mint", async function () {
      await expect(
        digitalBatch
          .connect(unregistered)
          .mintBatch(unregistered.address, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Caller is not a manufacturer");
    });

    it("Should revert when manufacturer tries to mint to a different address", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer2.address, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Manufacturer address must match caller");
    });

    it("Should revert when distributor tries to mint", async function () {
      await expect(
        digitalBatch
          .connect(distributor)
          .mintBatch(distributor.address, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Caller is not a manufacturer");
    });

    it("Should revert when pharmacist tries to mint", async function () {
      await expect(
        digitalBatch
          .connect(pharmacist)
          .mintBatch(pharmacist.address, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Caller is not a manufacturer");
    });

    it("Should revert when minting to zero address", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(ethers.ZeroAddress, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Manufacturer address must match caller");
    });

    it("Should revert with empty token URI", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, sampleTokenURIs.empty)
      ).to.be.revertedWith("Token URI cannot be empty");
    });

    it("Should reject token URI with unsupported scheme", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, "ftp://invalid-uri")
      ).to.be.revertedWith("Invalid token URI format");
    });
  });

  describe("Token URI Management", function () {
    it("Should return correct URI for minted token", async function () {
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      const uri = await digitalBatch.tokenURI(tokenId);
      expect(uri).to.equal(
        sampleTokenURIs.batch1,
        "Token URI should match the provided URI"
      );
    });

    it("Should support IPFS URIs format", async function () {
      const ipfsURI = "ipfs://QmYwAPJzv5CZsnAzt8auVZRoKXfDPHDCyJfVCLZpMKz6wS";

      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, ipfsURI);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      const uri = await digitalBatch.tokenURI(tokenId);
      expect(uri).to.equal(ipfsURI, "Should support IPFS URI format");
      expect(uri).to.include("ipfs://", "URI should contain IPFS protocol");
    });

    it("Should revert tokenURI query for non-existent token", async function () {
      const nonExistentTokenId = 999n;

      await expect(
        digitalBatch.tokenURI(nonExistentTokenId)
      ).to.be.revertedWithCustomError(digitalBatch, "ERC721NonexistentToken");
    });
  });

  describe("Enumerable Views", function () {
    beforeEach(async function () {
      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch2);
      await digitalBatch
        .connect(manufacturer2)
        .mintBatch(manufacturer2.address, sampleTokenURIs.batch3);
    });

    it("Should report correct totalSupply", async function () {
      expect(await digitalBatch.totalSupply()).to.equal(3n);
    });

    it("Should allow enumeration of owner tokens", async function () {
      const count = Number(await digitalBatch.balanceOf(manufacturer1.address));
      const tokens: bigint[] = [];
      for (let i = 0; i < count; i++) {
        const tokenId = await digitalBatch.tokenOfOwnerByIndex(manufacturer1.address, i);
        tokens.push(tokenId);
      }

      expect(tokens).to.deep.equal([1n, 2n]);
    });

    it("Should enumerate all tokens by index", async function () {
      const tokens: bigint[] = [];
      const supply = Number(await digitalBatch.totalSupply());
      for (let i = 0; i < supply; i++) {
        tokens.push(await digitalBatch.tokenByIndex(i));
      }

      expect(tokens).to.deep.equal([1n, 2n, 3n]);
    });
  });

  describe("Manufacturer Mint Limit", function () {
    beforeEach(async function () {
      await digitalBatch.connect(owner).setManufacturerMintLimit(0);
    });

    it("Should allow owner to update mint limit", async function () {
      await expect(digitalBatch.connect(owner).setManufacturerMintLimit(2))
        .to.emit(digitalBatch, "ManufacturerMintLimitUpdated")
        .withArgs(0, 2);

      expect(await digitalBatch.getManufacturerMintLimit()).to.equal(2n);
    });

    it("Should revert when non-owner sets mint limit", async function () {
      await expect(digitalBatch.connect(manufacturer1).setManufacturerMintLimit(1))
        .to.be.revertedWithCustomError(digitalBatch, "OwnableUnauthorizedAccount")
        .withArgs(manufacturer1.address);
    });

    it("Should enforce mint limit per manufacturer", async function () {
      await digitalBatch.connect(owner).setManufacturerMintLimit(1);

      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);

      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, sampleTokenURIs.batch2)
      ).to.be.revertedWith("Manufacturer mint limit reached");

      expect(await digitalBatch.getManufacturerActiveBatches(manufacturer1.address)).to.equal(1n);
    });

    it("Should allow minting again after burn when limit enforced", async function () {
      await digitalBatch.connect(owner).setManufacturerMintLimit(1);

      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      await digitalBatch.connect(manufacturer1).burn(tokenId);

      expect(await digitalBatch.getManufacturerActiveBatches(manufacturer1.address)).to.equal(0n);

      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch2);
    });
  });

  describe("Burn Function", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should allow token owner to burn their batch", async function () {
      await expect(digitalBatch.connect(manufacturer1).burn(tokenId))
        .to.emit(digitalBatch, "BatchBurned")
        .withArgs(tokenId, manufacturer1.address);
      await expect(digitalBatch.ownerOf(tokenId)).to.be.revertedWithCustomError(
        digitalBatch,
        "ERC721NonexistentToken"
      );
    });

    it("Should allow contract owner to burn without prior approval", async function () {
      await expect(digitalBatch.connect(owner).burn(tokenId))
        .to.emit(digitalBatch, "BatchBurned")
        .withArgs(tokenId, manufacturer1.address);
    });

    it("Should revert when unauthorized account attempts to burn", async function () {
      await expect(digitalBatch.connect(unregistered).burn(tokenId)).to.be.revertedWithCustomError(
        digitalBatch,
        "ERC721InsufficientApproval"
      );
    });

    it("Should allow burning while paused", async function () {
      await digitalBatch.connect(owner).pause();
      await expect(digitalBatch.connect(owner).burn(tokenId))
        .to.emit(digitalBatch, "BatchBurned")
        .withArgs(tokenId, manufacturer1.address);
    });
  });

  describe("StakeholderRegistry governance", function () {
    it("Should allow owner to update registry and enforce new roles", async function () {
      const newRegistry = await ethers.deployContract("StakeholderRegistry");
      await newRegistry.waitForDeployment();

      await digitalBatch.connect(owner).updateStakeholderRegistry(await newRegistry.getAddress());

      // manufacturer1 no longer registered in new registry
      await expect(
        digitalBatch.connect(manufacturer1).mintBatch(manufacturer1.address, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Caller is not a manufacturer");

      await newRegistry
        .connect(owner)
        .addStakeholder(manufacturer1.address, Role.Manufacturer);

      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
    });

    it("Should restrict registry updates to owner", async function () {
      const newRegistry = await ethers.deployContract("StakeholderRegistry");
      await newRegistry.waitForDeployment();

      await expect(
        digitalBatch
          .connect(manufacturer1)
          .updateStakeholderRegistry(await newRegistry.getAddress())
      )
        .to.be.revertedWithCustomError(digitalBatch, "OwnableUnauthorizedAccount")
        .withArgs(manufacturer1.address);
    });

    it("Should revert when updating registry with zero address or same address", async function () {
      await expect(digitalBatch.connect(owner).updateStakeholderRegistry(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid StakeholderRegistry address"
      );

      await expect(
        digitalBatch
          .connect(owner)
          .updateStakeholderRegistry(await stakeholderRegistry.getAddress())
      ).to.be.revertedWith("Registry already set");
    });
  });

  describe("Pause controls", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should allow owner to pause and unpause", async function () {
      await digitalBatch.connect(owner).pause();
      await digitalBatch.connect(owner).unpause();
    });

    it("Should restrict pause to owner", async function () {
      await expect(digitalBatch.connect(manufacturer1).pause())
        .to.be.revertedWithCustomError(digitalBatch, "OwnableUnauthorizedAccount")
        .withArgs(manufacturer1.address);
    });

    it("Should block minting while paused", async function () {
      await digitalBatch.connect(owner).pause();
      await expect(
        digitalBatch.connect(manufacturer1).mintBatch(manufacturer1.address, sampleTokenURIs.batch2)
      ).to.be.revertedWithCustomError(digitalBatch, "EnforcedPause");
    });

    it("Should block transfers while paused", async function () {
      await digitalBatch.connect(owner).pause();
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .transferFrom(manufacturer1.address, distributor.address, tokenId)
      ).to.be.revertedWithCustomError(digitalBatch, "EnforcedPause");
    });

    it("Should allow burn while paused", async function () {
      await digitalBatch.connect(owner).pause();
      await digitalBatch.connect(manufacturer1).burn(tokenId);
    });
  });

  describe("Custody Manager Transfer Controls", function () {
    let tokenId: bigint;
    let trackAndTraceOperator: SignerWithAddress;

    beforeEach(async function () {
      // Mint a token for transfer tests
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;

      // Use the unregistered signer to simulate the TrackAndTrace contract
      trackAndTraceOperator = unregistered;

      await expect(
        digitalBatch.connect(owner).updateCustodyManager(trackAndTraceOperator.address)
      )
        .to.emit(digitalBatch, "CustodyManagerUpdated")
        .withArgs(owner.address, trackAndTraceOperator.address);

      // Manufacturer grants blanket approval to the custody manager
      await digitalBatch
        .connect(manufacturer1)
        .setApprovalForAll(trackAndTraceOperator.address, true);
    });

    it("Should prevent direct transfers by the token owner when custody manager enforced", async function () {
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .transferFrom(manufacturer1.address, distributor.address, tokenId)
      ).to.be.revertedWith("Transfers restricted to custody manager");
    });

    it("Should allow custody manager to transfer via safeTransferFrom", async function () {
      await digitalBatch
        .connect(trackAndTraceOperator)
        ["safeTransferFrom(address,address,uint256)"](
          manufacturer1.address,
          distributor.address,
          tokenId
        );

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        distributor.address,
        "Custody manager should be able to orchestrate transfers"
      );
    });

    it("Should allow contract owner to transfer as break-glass override", async function () {
      await digitalBatch
        .connect(owner)
        .transferFrom(manufacturer1.address, distributor.address, tokenId);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        distributor.address,
        "Contract owner retains emergency transfer capability"
      );
    });

    it("Should reject transfers from approved addresses that are not the custody manager", async function () {
      await digitalBatch.connect(manufacturer1).approve(pharmacist.address, tokenId);

      await expect(
        digitalBatch
          .connect(pharmacist)
          .transferFrom(manufacturer1.address, pharmacist.address, tokenId)
      ).to.be.revertedWith("Transfers restricted to custody manager");
    });

    it("Should reject operator transfers when operator is not the custody manager", async function () {
      await digitalBatch
        .connect(manufacturer1)
        .setApprovalForAll(distributor.address, true);

      await expect(
        digitalBatch
          .connect(distributor)
          .transferFrom(manufacturer1.address, pharmacist.address, tokenId)
      ).to.be.revertedWith("Transfers restricted to custody manager");
    });

    it("Should allow owner to clear custody manager to restore standard ERC-721 behavior", async function () {
      await expect(
        digitalBatch.connect(owner).updateCustodyManager(ethers.ZeroAddress)
      )
        .to.emit(digitalBatch, "CustodyManagerUpdated")
        .withArgs(trackAndTraceOperator.address, ethers.ZeroAddress);

      await digitalBatch
        .connect(manufacturer1)
        .transferFrom(manufacturer1.address, distributor.address, tokenId);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        distributor.address,
        "Direct transfers should function once custody manager restrictions are cleared"
      );
    });

    it("Should revert when attempting to set the same custody manager twice", async function () {
      await expect(
        digitalBatch.connect(owner).updateCustodyManager(trackAndTraceOperator.address)
      ).to.be.revertedWith("Custody manager already set");
    });
  });

  describe("StakeholderRegistry Integration", function () {
    it("Should successfully mint when address has Manufacturer role", async function () {
      // Verify manufacturer1 has the correct role
      const role = await stakeholderRegistry.getRole(manufacturer1.address);
      expect(role).to.equal(Role.Manufacturer);

      // Should be able to mint
      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
    });

    it("Should revert when manufacturer role is revoked", async function () {
      // First, mint successfully
      await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);

      // Change role to Distributor (effectively revoking Manufacturer role)
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(manufacturer1.address, Role.Distributor);

      // Verify role changed
      const newRole = await stakeholderRegistry.getRole(manufacturer1.address);
      expect(newRole).to.equal(Role.Distributor);

      // Should now fail to mint
      await expect(
        digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, sampleTokenURIs.batch2)
      ).to.be.revertedWith("Caller is not a manufacturer");
    });

    it("Should allow multiple different manufacturers to mint", async function () {
      // Manufacturer 1 mints
      const tx1 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      await expect(tx1)
        .to.emit(digitalBatch, "BatchMinted")
        .withArgs(1n, manufacturer1.address, sampleTokenURIs.batch1);

      // Manufacturer 2 mints
      const tx2 = await digitalBatch
        .connect(manufacturer2)
        .mintBatch(manufacturer2.address, sampleTokenURIs.batch2);
      await expect(tx2)
        .to.emit(digitalBatch, "BatchMinted")
        .withArgs(2n, manufacturer2.address, sampleTokenURIs.batch2);

      // Verify balances
      const balance1 = await digitalBatch.balanceOf(manufacturer1.address);
      const balance2 = await digitalBatch.balanceOf(manufacturer2.address);

      expect(balance1).to.equal(1n, "Manufacturer1 should have 1 token");
      expect(balance2).to.equal(1n, "Manufacturer2 should have 1 token");
    });

    it("Should respect role changes (address gains Manufacturer role)", async function () {
      // Initially, distributor cannot mint
      await expect(
        digitalBatch
          .connect(distributor)
          .mintBatch(distributor.address, sampleTokenURIs.batch1)
      ).to.be.revertedWith("Caller is not a manufacturer");

      // Change distributor's role to Manufacturer
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(distributor.address, Role.Manufacturer);

      // Verify role changed
      const newRole = await stakeholderRegistry.getRole(distributor.address);
      expect(newRole).to.equal(Role.Manufacturer);

      // Should now be able to mint
      await digitalBatch
        .connect(distributor)
        .mintBatch(distributor.address, sampleTokenURIs.batch1);
    });
  });

  describe("Edge Cases", function () {
    it("Should allow manufacturer with multiple tokens", async function () {
      const tokenURIs = [
        sampleTokenURIs.batch1,
        sampleTokenURIs.batch2,
        sampleTokenURIs.batch3,
      ];

      // Mint multiple tokens
      for (const uri of tokenURIs) {
        await digitalBatch
          .connect(manufacturer1)
          .mintBatch(manufacturer1.address, uri);
      }

      const balance = await digitalBatch.balanceOf(manufacturer1.address);
      expect(balance).to.equal(
        BigInt(tokenURIs.length),
        "Manufacturer should have 3 tokens"
      );

      // Verify each token has correct URI and owner
      for (let i = 1; i <= tokenURIs.length; i++) {
        const tokenId = BigInt(i);
        const owner = await digitalBatch.ownerOf(tokenId);
        const uri = await digitalBatch.tokenURI(tokenId);

        expect(owner).to.equal(
          manufacturer1.address,
          `Token ${i} should be owned by manufacturer`
        );
        expect(uri).to.equal(
          tokenURIs[i - 1],
          `Token ${i} should have correct URI`
        );
      }
    });

    it("Should handle long token URIs (realistic IPFS hashes)", async function () {
      const longIPFSHash =
        "ipfs://QmYwAPJzv5CZsnAzt8auVZRoKXfDPHDCyJfVCLZpMKz6wSabcdefghijklmnopqrstuvwxyz0123456789";

      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, longIPFSHash);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId = event?.args?.tokenId;

      const uri = await digitalBatch.tokenURI(tokenId);
      expect(uri).to.equal(
        longIPFSHash,
        "Should handle long IPFS hash URIs"
      );
      expect(uri.length).to.be.greaterThan(
        50,
        "URI should be longer than 50 characters"
      );
    });

    it("Should prevent token ID collision", async function () {
      // Mint 3 tokens
      const tx1 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt1 = await tx1.wait();
      const event1 = receipt1?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId1 = event1?.args?.tokenId;

      const tx2 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch2);
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId2 = event2?.args?.tokenId;

      const tx3 = await digitalBatch
        .connect(manufacturer2)
        .mintBatch(manufacturer2.address, sampleTokenURIs.batch3);
      const receipt3 = await tx3.wait();
      const event3 = receipt3?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId3 = event3?.args?.tokenId;

      // All token IDs should be unique
      expect(tokenId1).to.not.equal(tokenId2, "Token IDs 1 and 2 should be unique");
      expect(tokenId1).to.not.equal(tokenId3, "Token IDs 1 and 3 should be unique");
      expect(tokenId2).to.not.equal(tokenId3, "Token IDs 2 and 3 should be unique");

      // Token IDs should be sequential
      expect(tokenId1).to.equal(1n, "First token ID should be 1");
      expect(tokenId2).to.equal(2n, "Second token ID should be 2");
      expect(tokenId3).to.equal(3n, "Third token ID should be 3");
    });
  });
});
