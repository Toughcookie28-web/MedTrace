import { expect } from "chai";
import { network } from "hardhat";
import type { TrackAndTrace, DigitalBatch, StakeholderRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

describe("TrackAndTrace", function () {
  let trackAndTrace: TrackAndTrace;
  let digitalBatch: DigitalBatch;
  let stakeholderRegistry: StakeholderRegistry;
  let owner: SignerWithAddress;
  let manufacturer1: SignerWithAddress;
  let manufacturer2: SignerWithAddress;
  let distributor1: SignerWithAddress;
  let distributor2: SignerWithAddress;
  let pharmacist1: SignerWithAddress;
  let pharmacist2: SignerWithAddress;
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
  };

  // Realistic event data for testing
  const eventData = {
    temperature: JSON.stringify({
      eventType: "temperature_reading",
      temperature: 4.5,
      unit: "celsius",
      location: "Cold Storage Facility A",
      sensorId: "TEMP-001",
    }),
    inspection: JSON.stringify({
      eventType: "quality_inspection",
      inspector: "John Doe",
      status: "passed",
      notes: "All packaging intact, no visible damage",
      checkpoints: ["seal_integrity", "label_quality", "expiry_visible"],
    }),
    location: JSON.stringify({
      eventType: "location_update",
      latitude: 40.7128,
      longitude: -74.0060,
      address: "123 Distribution Center, New York, NY",
      facility: "Northeast Distribution Hub",
    }),
    shipment: JSON.stringify({
      eventType: "shipment_departure",
      carrier: "PharmaTrans Logistics",
      trackingNumber: "PT-2024-001234",
      destination: "Retail Pharmacy Network",
      estimatedArrival: "2024-01-15T14:30:00Z",
    }),
    arrival: JSON.stringify({
      eventType: "shipment_arrival",
      carrier: "PharmaTrans Logistics",
      trackingNumber: "PT-2024-001234",
      condition: "excellent",
      receivedBy: "Jane Smith",
    }),
  };

  // Helper function to deploy all three contracts before each test
  async function deployContractsFixture() {
    const [
      deployer,
      mfg1,
      mfg2,
      dist1,
      dist2,
      pharm1,
      pharm2,
      unreg,
    ] = await ethers.getSigners();

    // Deploy StakeholderRegistry first
    const registry = await ethers.deployContract("StakeholderRegistry");
    await registry.waitForDeployment();

    // Register test addresses with different roles
    await registry.connect(deployer).addStakeholder(mfg1.address, Role.Manufacturer);
    await registry.connect(deployer).addStakeholder(mfg2.address, Role.Manufacturer);
    await registry.connect(deployer).addStakeholder(dist1.address, Role.Distributor);
    await registry.connect(deployer).addStakeholder(dist2.address, Role.Distributor);
    await registry.connect(deployer).addStakeholder(pharm1.address, Role.Pharmacist);
    await registry.connect(deployer).addStakeholder(pharm2.address, Role.Pharmacist);

    // Deploy DigitalBatch with StakeholderRegistry address
    const registryAddress = await registry.getAddress();
    const batch = await ethers.deployContract("DigitalBatch", [registryAddress]);
    await batch.waitForDeployment();

    // Deploy TrackAndTrace with StakeholderRegistry and DigitalBatch addresses
    const batchAddress = await batch.getAddress();
    const track = await ethers.deployContract("TrackAndTrace", [
      registryAddress,
      batchAddress,
    ]);
    await track.waitForDeployment();

    return {
      track,
      batch,
      registry,
      deployer,
      mfg1,
      mfg2,
      dist1,
      dist2,
      pharm1,
      pharm2,
      unreg,
    };
  }

  beforeEach(async function () {
    const fixture = await deployContractsFixture();
    trackAndTrace = fixture.track;
    digitalBatch = fixture.batch;
    stakeholderRegistry = fixture.registry;
    owner = fixture.deployer;
    manufacturer1 = fixture.mfg1;
    manufacturer2 = fixture.mfg2;
    distributor1 = fixture.dist1;
    distributor2 = fixture.dist2;
    pharmacist1 = fixture.pharm1;
    pharmacist2 = fixture.pharm2;
    unregistered = fixture.unreg;

    // Approve TrackAndTrace contract for all stakeholders
    const trackAndTraceAddress = await trackAndTrace.getAddress();
    await digitalBatch.connect(owner).updateCustodyManager(trackAndTraceAddress);
    await digitalBatch.connect(manufacturer1).setApprovalForAll(trackAndTraceAddress, true);
    await digitalBatch.connect(manufacturer2).setApprovalForAll(trackAndTraceAddress, true);
    await digitalBatch.connect(distributor1).setApprovalForAll(trackAndTraceAddress, true);
    await digitalBatch.connect(distributor2).setApprovalForAll(trackAndTraceAddress, true);
    await digitalBatch.connect(pharmacist1).setApprovalForAll(trackAndTraceAddress, true);
    await digitalBatch.connect(pharmacist2).setApprovalForAll(trackAndTraceAddress, true);
  });

  describe("Deployment Tests", function () {
    it("Should deploy successfully", async function () {
      const address = await trackAndTrace.getAddress();
      expect(address).to.properAddress;
      expect(address).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct StakeholderRegistry address", async function () {
      const registryAddress = await stakeholderRegistry.getAddress();
      const storedRegistryAddress = await trackAndTrace.stakeholderRegistry();
      expect(storedRegistryAddress).to.equal(
        registryAddress,
        "StakeholderRegistry address should be correctly set"
      );
    });

    it("Should set correct DigitalBatch address", async function () {
      const batchAddress = await digitalBatch.getAddress();
      const storedBatchAddress = await trackAndTrace.digitalBatch();
      expect(storedBatchAddress).to.equal(
        batchAddress,
        "DigitalBatch address should be correctly set"
      );
    });

    it("Should revert with zero address for StakeholderRegistry", async function () {
      const batchAddress = await digitalBatch.getAddress();
      await expect(
        ethers.deployContract("TrackAndTrace", [ethers.ZeroAddress, batchAddress])
      ).to.be.revertedWith("Invalid StakeholderRegistry address");
    });

    it("Should revert with zero address for DigitalBatch", async function () {
      const registryAddress = await stakeholderRegistry.getAddress();
      await expect(
        ethers.deployContract("TrackAndTrace", [registryAddress, ethers.ZeroAddress])
      ).to.be.revertedWith("Invalid DigitalBatch address");
    });
  });

  describe("transferCustody - Success Cases", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should allow manufacturer to transfer batch to distributor", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        distributor1.address,
        "Batch should be transferred to distributor"
      );
    });

    it("Should allow distributor to transfer batch to pharmacist", async function () {
      // First transfer to distributor
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      // Then transfer to pharmacist
      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        pharmacist1.address,
        "Batch should be transferred to pharmacist"
      );
    });

    it("Should allow pharmacist to transfer batch to another pharmacist", async function () {
      // Transfer chain: manufacturer -> distributor -> pharmacist1 -> pharmacist2
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, pharmacist2.address);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        pharmacist2.address,
        "Batch should be transferred to second pharmacist"
      );
    });

    it("Should emit CustodyTransferred event with correct parameters", async function () {
      const tx = await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;

      await expect(tx)
        .to.emit(trackAndTrace, "CustodyTransferred")
        .withArgs(
          tokenId,
          manufacturer1.address,
          distributor1.address,
          timestamp
        );
    });

    it("Should update DigitalBatch NFT ownership", async function () {
      const ownerBefore = await digitalBatch.ownerOf(tokenId);
      expect(ownerBefore).to.equal(manufacturer1.address);

      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      const ownerAfter = await digitalBatch.ownerOf(tokenId);
      expect(ownerAfter).to.equal(
        distributor1.address,
        "NFT ownership should be updated"
      );
    });

    it("Should record custody transfer in history", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(1, "Should have one custody record");
      expect(history[0].from).to.equal(manufacturer1.address);
      expect(history[0].to).to.equal(distributor1.address);
      expect(history[0].timestamp).to.be.greaterThan(0);
    });

    it("Should allow transfer back to manufacturer (reverse logistics)", async function () {
      // Transfer to distributor
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      // Transfer back to manufacturer (e.g., for recall)
      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, manufacturer1.address);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(
        manufacturer1.address,
        "Batch should be back with manufacturer"
      );

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(2, "Should have two custody records");
    });

    it("Should handle multiple sequential transfers correctly", async function () {
      // Complete supply chain: mfg1 -> dist1 -> pharm1 -> pharm2 -> mfg1 (recall)
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, pharmacist2.address);

      await trackAndTrace
        .connect(pharmacist2)
        .transferCustody(tokenId, manufacturer1.address);

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(4, "Should have four custody records");

      // Verify order
      expect(history[0].from).to.equal(manufacturer1.address);
      expect(history[0].to).to.equal(distributor1.address);
      expect(history[1].from).to.equal(distributor1.address);
      expect(history[1].to).to.equal(pharmacist1.address);
      expect(history[2].from).to.equal(pharmacist1.address);
      expect(history[2].to).to.equal(pharmacist2.address);
      expect(history[3].from).to.equal(pharmacist2.address);
      expect(history[3].to).to.equal(manufacturer1.address);
    });
  });

  describe("transferCustody - Failure Cases", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should revert when non-owner tries to transfer", async function () {
      await expect(
        trackAndTrace
          .connect(distributor1)
          .transferCustody(tokenId, pharmacist1.address)
      ).to.be.revertedWith("Caller is not the token owner");
    });

    it("Should revert when transferring to zero address", async function () {
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .transferCustody(tokenId, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should revert when transferring to unregistered address", async function () {
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .transferCustody(tokenId, unregistered.address)
      ).to.be.revertedWith("Recipient does not have a valid role");
    });

    it("Should revert when transferring non-existent token", async function () {
      const nonExistentTokenId = 999n;
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .transferCustody(nonExistentTokenId, distributor1.address)
      ).to.be.revertedWith("Caller is not the token owner");
    });

    it("Should revert when transferring to same address (self-transfer)", async function () {
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .transferCustody(tokenId, manufacturer1.address)
      ).to.be.revertedWith("Cannot transfer to self");
    });

    it("Should revert when caller has no valid role", async function () {
      await expect(
        trackAndTrace
          .connect(unregistered)
          .transferCustody(tokenId, distributor1.address)
      ).to.be.revertedWith("Caller is not the token owner");
    });
  });

  describe("logEvent - Success Cases", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should allow token owner to log event", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(1, "Should have one event logged");
    });

    it("Should emit EventLogged with correct parameters", async function () {
      const tx = await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;

      await expect(tx)
        .to.emit(trackAndTrace, "EventLogged")
        .withArgs(
          tokenId,
          manufacturer1.address,
          eventData.temperature,
          timestamp
        );
    });

    it("Should store event data in batch history", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events[0].eventData).to.equal(
        eventData.temperature,
        "Event data should be stored correctly"
      );
    });

    it("Should allow multiple events for same token", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.inspection);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.location);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(3, "Should have three events logged");
    });

    it("Should include timestamp in event record", async function () {
      const tx = await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expectedTimestamp = block!.timestamp;

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events[0].timestamp).to.equal(
        expectedTimestamp,
        "Timestamp should match block timestamp"
      );
    });

    it("Should preserve event order (chronological)", async function () {
      // Log multiple events in sequence
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.inspection);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.location);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(3);

      // Verify chronological order
      expect(events[0].timestamp).to.be.lessThanOrEqual(events[1].timestamp);
      expect(events[1].timestamp).to.be.lessThanOrEqual(events[2].timestamp);

      // Verify data order
      expect(events[0].eventData).to.equal(eventData.temperature);
      expect(events[1].eventData).to.equal(eventData.inspection);
      expect(events[2].eventData).to.equal(eventData.location);
    });

    it("Should allow different event types (temperature, inspection, location)", async function () {
      // Temperature event
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      // Transfer to distributor
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      // Inspection event from distributor
      await trackAndTrace
        .connect(distributor1)
        .logEvent(tokenId, eventData.inspection);

      // Location event from distributor
      await trackAndTrace
        .connect(distributor1)
        .logEvent(tokenId, eventData.location);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(3);

      // Verify different event types are stored
      expect(events[0].eventData).to.include("temperature_reading");
      expect(events[1].eventData).to.include("quality_inspection");
      expect(events[2].eventData).to.include("location_update");
    });
  });

  describe("logEvent - Failure Cases", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should revert when non-owner tries to log event", async function () {
      await expect(
        trackAndTrace
          .connect(distributor1)
          .logEvent(tokenId, eventData.temperature)
      ).to.be.revertedWith("Caller is not the token owner");
    });

    it("Should revert when logging for non-existent token", async function () {
      const nonExistentTokenId = 999n;
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .logEvent(nonExistentTokenId, eventData.temperature)
      ).to.be.revertedWith("Caller is not the token owner");
    });

    it("Should revert with empty event data", async function () {
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .logEvent(tokenId, "")
      ).to.be.revertedWith("Event data cannot be empty");
    });

    it("Should revert when caller has no valid role", async function () {
      await expect(
        trackAndTrace
          .connect(unregistered)
          .logEvent(tokenId, eventData.temperature)
      ).to.be.revertedWith("Caller is not the token owner");
    });
  });

  describe("Event History Retrieval", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should return complete event history for token", async function () {
      // Log multiple events
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.inspection);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.location);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(3, "Should return all logged events");
    });

    it("Should return events in chronological order", async function () {
      // Log events
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.inspection);

      const events = await trackAndTrace.getBatchEvents(tokenId);

      // Verify chronological order
      expect(events[0].timestamp).to.be.lessThanOrEqual(events[1].timestamp);
    });

    it("Should return empty array for token with no events", async function () {
      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(0, "Should return empty array for no events");
    });

    it("Should include all event metadata (timestamp, logger, data)", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(1);

      // Verify all metadata is present
      expect(events[0].logger).to.equal(manufacturer1.address);
      expect(events[0].timestamp).to.be.greaterThan(0);
      expect(events[0].eventData).to.equal(eventData.temperature);
    });

    it("Should handle tokens with many events (10+ events)", async function () {
      // Log 15 events
      for (let i = 0; i < 15; i++) {
        await trackAndTrace
          .connect(manufacturer1)
          .logEvent(tokenId, `Event ${i}: ${eventData.temperature}`);
      }

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(15, "Should handle 15 events correctly");

      // Verify all events are retrievable
      for (let i = 0; i < 15; i++) {
        expect(events[i].eventData).to.include(`Event ${i}`);
      }
    });
  });

  describe("Custody History Retrieval", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should return complete custody chain for token", async function () {
      // Perform multiple custody transfers
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(2, "Should have complete custody chain");
    });

    it("Should show all previous owners", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      const history = await trackAndTrace.getCustodyHistory(tokenId);

      expect(history[0].from).to.equal(manufacturer1.address);
      expect(history[0].to).to.equal(distributor1.address);
      expect(history[1].from).to.equal(distributor1.address);
      expect(history[1].to).to.equal(pharmacist1.address);
    });

    it("Should include timestamps for each transfer", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history[0].timestamp).to.be.greaterThan(0, "Should have timestamp");
    });

    it("Should return empty array for never-transferred token", async function () {
      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(
        0,
        "Should return empty array for token never transferred via TrackAndTrace"
      );
    });
  });

  describe("StakeholderRegistry Integration", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should verify roles before custody transfer", async function () {
      // Verify distributor has correct role
      const role = await stakeholderRegistry.getRole(distributor1.address);
      expect(role).to.equal(Role.Distributor);

      // Transfer should succeed
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      const newOwner = await digitalBatch.ownerOf(tokenId);
      expect(newOwner).to.equal(distributor1.address);
    });

    it("Should allow transfer when roles are valid", async function () {
      // All registered stakeholders should be able to receive transfers
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, manufacturer2.address);

      const finalOwner = await digitalBatch.ownerOf(tokenId);
      expect(finalOwner).to.equal(manufacturer2.address);
    });

    it("Should revert transfer when recipient role is revoked", async function () {
      // Change distributor1's role to None (effectively revoking access)
      // Note: StakeholderRegistry doesn't allow setting role to None via addStakeholder
      // So we test with unregistered address instead
      await expect(
        trackAndTrace
          .connect(manufacturer1)
          .transferCustody(tokenId, unregistered.address)
      ).to.be.revertedWith("Recipient does not have a valid role");
    });

    it("Should work with multiple stakeholders of same role", async function () {
      // Transfer between two manufacturers
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, manufacturer2.address);

      let owner = await digitalBatch.ownerOf(tokenId);
      expect(owner).to.equal(manufacturer2.address);

      // Transfer between two distributors
      await trackAndTrace
        .connect(manufacturer2)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, distributor2.address);

      owner = await digitalBatch.ownerOf(tokenId);
      expect(owner).to.equal(distributor2.address);

      // Transfer between two pharmacists
      await trackAndTrace
        .connect(distributor2)
        .transferCustody(tokenId, pharmacist1.address);

      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, pharmacist2.address);

      owner = await digitalBatch.ownerOf(tokenId);
      expect(owner).to.equal(pharmacist2.address);
    });
  });

  describe("DigitalBatch Integration", function () {
    let tokenId1: bigint;
    let tokenId2: bigint;

    beforeEach(async function () {
      // Mint two batches from different manufacturers
      const tx1 = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt1 = await tx1.wait();

      const event1 = receipt1?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId1 = event1?.args?.tokenId;

      const tx2 = await digitalBatch
        .connect(manufacturer2)
        .mintBatch(manufacturer2.address, sampleTokenURIs.batch2);
      const receipt2 = await tx2.wait();

      const event2 = receipt2?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId2 = event2?.args?.tokenId;
    });

    it("Should correctly query NFT ownership", async function () {
      const owner1 = await digitalBatch.ownerOf(tokenId1);
      const owner2 = await digitalBatch.ownerOf(tokenId2);

      expect(owner1).to.equal(manufacturer1.address);
      expect(owner2).to.equal(manufacturer2.address);
    });

    it("Should update NFT ownership on custody transfer", async function () {
      // Transfer first batch
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId1, distributor1.address);

      const owner1 = await digitalBatch.ownerOf(tokenId1);
      expect(owner1).to.equal(
        distributor1.address,
        "Token 1 ownership should be updated"
      );

      // Second batch should remain unchanged
      const owner2 = await digitalBatch.ownerOf(tokenId2);
      expect(owner2).to.equal(
        manufacturer2.address,
        "Token 2 ownership should be unchanged"
      );
    });

    it("Should handle multiple batches simultaneously", async function () {
      // Transfer both batches to different distributors
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId1, distributor1.address);

      await trackAndTrace
        .connect(manufacturer2)
        .transferCustody(tokenId2, distributor2.address);

      const owner1 = await digitalBatch.ownerOf(tokenId1);
      const owner2 = await digitalBatch.ownerOf(tokenId2);

      expect(owner1).to.equal(distributor1.address);
      expect(owner2).to.equal(distributor2.address);

      // Log events for both batches
      await trackAndTrace
        .connect(distributor1)
        .logEvent(tokenId1, eventData.temperature);

      await trackAndTrace
        .connect(distributor2)
        .logEvent(tokenId2, eventData.inspection);

      const events1 = await trackAndTrace.getBatchEvents(tokenId1);
      const events2 = await trackAndTrace.getBatchEvents(tokenId2);

      expect(events1.length).to.equal(1);
      expect(events2.length).to.equal(1);
      expect(events1[0].eventData).to.include("temperature_reading");
      expect(events2[0].eventData).to.include("quality_inspection");
    });

    it("Should work with batches from different manufacturers", async function () {
      // Both manufacturers transfer their batches
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId1, distributor1.address);

      await trackAndTrace
        .connect(manufacturer2)
        .transferCustody(tokenId2, distributor1.address);

      // Distributor1 now owns both batches
      const owner1 = await digitalBatch.ownerOf(tokenId1);
      const owner2 = await digitalBatch.ownerOf(tokenId2);

      expect(owner1).to.equal(distributor1.address);
      expect(owner2).to.equal(distributor1.address);

      // Distributor1 can log events for both
      await trackAndTrace
        .connect(distributor1)
        .logEvent(tokenId1, eventData.location);

      await trackAndTrace
        .connect(distributor1)
        .logEvent(tokenId2, eventData.location);

      const events1 = await trackAndTrace.getBatchEvents(tokenId1);
      const events2 = await trackAndTrace.getBatchEvents(tokenId2);

      expect(events1.length).to.equal(1);
      expect(events2.length).to.equal(1);
    });
  });

  describe("Edge Cases & Complex Scenarios", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch to manufacturer1
      const tx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = event?.args?.tokenId;
    });

    it("Should handle batch returning to manufacturer (recall)", async function () {
      // Simulate a complete supply chain cycle with recall
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);

      // Recall back to manufacturer
      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, manufacturer1.address);

      const owner = await digitalBatch.ownerOf(tokenId);
      expect(owner).to.equal(
        manufacturer1.address,
        "Batch should be back with manufacturer"
      );

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(3);
      expect(history[2].to).to.equal(manufacturer1.address);
    });

    it("Should handle distributor-to-distributor transfers", async function () {
      // Transfer to first distributor
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      // Transfer between distributors (e.g., regional hub transfer)
      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, distributor2.address);

      const owner = await digitalBatch.ownerOf(tokenId);
      expect(owner).to.equal(
        distributor2.address,
        "Batch should be with second distributor"
      );

      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history[1].from).to.equal(distributor1.address);
      expect(history[1].to).to.equal(distributor2.address);
    });

    it("Should handle very long event histories (20+ events)", async function () {
      // Log 25 events
      for (let i = 0; i < 25; i++) {
        await trackAndTrace
          .connect(manufacturer1)
          .logEvent(tokenId, `Event ${i}: ${eventData.temperature}`);
      }

      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(25, "Should handle 25 events");

      // Verify all events are in order
      for (let i = 0; i < 25; i++) {
        expect(events[i].eventData).to.include(`Event ${i}`);
      }

      // Verify chronological order
      for (let i = 1; i < 25; i++) {
        expect(events[i - 1].timestamp).to.be.lessThanOrEqual(
          events[i].timestamp
        );
      }
    });

    it("Should handle simultaneous operations on different batches", async function () {
      // Mint a second batch
      const tx2 = await digitalBatch
        .connect(manufacturer2)
        .mintBatch(manufacturer2.address, sampleTokenURIs.batch2);
      const receipt2 = await tx2.wait();

      const event2 = receipt2?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      const tokenId2 = event2?.args?.tokenId;

      // Perform operations on first batch
      await trackAndTrace
        .connect(manufacturer1)
        .logEvent(tokenId, eventData.temperature);

      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      // Perform operations on second batch
      await trackAndTrace
        .connect(manufacturer2)
        .logEvent(tokenId2, eventData.inspection);

      await trackAndTrace
        .connect(manufacturer2)
        .transferCustody(tokenId2, distributor2.address);

      // Verify both batches maintained independent state
      const events1 = await trackAndTrace.getBatchEvents(tokenId);
      const events2 = await trackAndTrace.getBatchEvents(tokenId2);

      expect(events1.length).to.equal(1);
      expect(events2.length).to.equal(1);

      const history1 = await trackAndTrace.getCustodyHistory(tokenId);
      const history2 = await trackAndTrace.getCustodyHistory(tokenId2);

      expect(history1.length).to.equal(1);
      expect(history2.length).to.equal(1);

      expect(history1[0].to).to.equal(distributor1.address);
      expect(history2[0].to).to.equal(distributor2.address);
    });

    it("Should handle batch with complex custody chain (5+ transfers)", async function () {
      // Create a complex custody chain with 6 transfers
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .logEvent(tokenId, eventData.shipment);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, distributor2.address);

      await trackAndTrace
        .connect(distributor2)
        .logEvent(tokenId, eventData.arrival);

      await trackAndTrace
        .connect(distributor2)
        .transferCustody(tokenId, pharmacist1.address);

      await trackAndTrace
        .connect(pharmacist1)
        .logEvent(tokenId, eventData.inspection);

      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, pharmacist2.address);

      await trackAndTrace
        .connect(pharmacist2)
        .logEvent(tokenId, eventData.temperature);

      await trackAndTrace
        .connect(pharmacist2)
        .transferCustody(tokenId, distributor1.address);

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, manufacturer1.address);

      // Verify complete custody chain
      const history = await trackAndTrace.getCustodyHistory(tokenId);
      expect(history.length).to.equal(6, "Should have 6 custody transfers");

      // Verify events were logged throughout the chain
      const events = await trackAndTrace.getBatchEvents(tokenId);
      expect(events.length).to.equal(4, "Should have 4 events logged");

      // Verify final owner
      const finalOwner = await digitalBatch.ownerOf(tokenId);
      expect(finalOwner).to.equal(
        manufacturer1.address,
        "Batch should be back with original manufacturer"
      );

      // Verify custody chain is complete and accurate
      expect(history[0].from).to.equal(manufacturer1.address);
      expect(history[0].to).to.equal(distributor1.address);
      expect(history[5].from).to.equal(distributor1.address);
      expect(history[5].to).to.equal(manufacturer1.address);
    });
  });

  describe("Pagination Helpers", function () {
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

    it("Should expose accurate event counts and paginated slices", async function () {
      for (let i = 0; i < 5; i++) {
        await trackAndTrace
          .connect(manufacturer1)
          .logEvent(
            tokenId,
            JSON.stringify({ idx: i, label: `event-${i}` })
          );
      }

      const eventCount = await trackAndTrace.getBatchEventCount(tokenId);
      expect(eventCount).to.equal(5n);

      const [firstPage, totalFromFirst] =
        await trackAndTrace.getBatchEventsPaginated(tokenId, 0, 2);
      expect(totalFromFirst).to.equal(5n);
      expect(firstPage.length).to.equal(2);
      expect(firstPage[0].eventData).to.include(`event-0`);
      expect(firstPage[1].eventData).to.include(`event-1`);

      const [secondPage, totalFromSecond] =
        await trackAndTrace.getBatchEventsPaginated(tokenId, 2, 2);
      expect(totalFromSecond).to.equal(5n);
      expect(secondPage.length).to.equal(2);
      expect(secondPage[0].eventData).to.include(`event-2`);
      expect(secondPage[1].eventData).to.include(`event-3`);

      const [finalPage, totalFromFinal] =
        await trackAndTrace.getBatchEventsPaginated(tokenId, 4, 2);
      expect(totalFromFinal).to.equal(5n);
      expect(finalPage.length).to.equal(1);
      expect(finalPage[0].eventData).to.include(`event-4`);

      const [emptyPage, totalFromEmpty] =
        await trackAndTrace.getBatchEventsPaginated(tokenId, 5, 2);
      expect(totalFromEmpty).to.equal(5n);
      expect(emptyPage.length).to.equal(0);
    });

    it("Should expose accurate custody counts and paginated slices", async function () {
      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);
      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, distributor2.address);
      await trackAndTrace
        .connect(distributor2)
        .transferCustody(tokenId, pharmacist1.address);
      await trackAndTrace
        .connect(pharmacist1)
        .transferCustody(tokenId, manufacturer1.address);

      const custodyCount = await trackAndTrace.getCustodyHistoryCount(tokenId);
      expect(custodyCount).to.equal(4n);

      const [firstWindow, totalFromFirstWindow] =
        await trackAndTrace.getCustodyHistoryPaginated(tokenId, 0, 2);
      expect(totalFromFirstWindow).to.equal(4n);
      expect(firstWindow.length).to.equal(2);
      expect(firstWindow[0].from).to.equal(manufacturer1.address);
      expect(firstWindow[0].to).to.equal(distributor1.address);
      expect(firstWindow[1].from).to.equal(distributor1.address);
      expect(firstWindow[1].to).to.equal(distributor2.address);

      const [secondWindow, totalFromSecondWindow] =
        await trackAndTrace.getCustodyHistoryPaginated(tokenId, 2, 5);
      expect(totalFromSecondWindow).to.equal(4n);
      expect(secondWindow.length).to.equal(2);
      expect(secondWindow[0].from).to.equal(distributor2.address);
      expect(secondWindow[0].to).to.equal(pharmacist1.address);
      expect(secondWindow[1].from).to.equal(pharmacist1.address);
      expect(secondWindow[1].to).to.equal(manufacturer1.address);

      const [emptyWindow, totalFromEmptyWindow] =
        await trackAndTrace.getCustodyHistoryPaginated(tokenId, 4, 5);
      expect(totalFromEmptyWindow).to.equal(4n);
      expect(emptyWindow.length).to.equal(0);
    });

    it("Should enforce pagination guard rails", async function () {
      await expect(
        trackAndTrace.getBatchEventsPaginated(tokenId, 0, 0)
      ).to.be.revertedWith("Limit must be greater than zero");

      await expect(
        trackAndTrace.getCustodyHistoryPaginated(tokenId, 0, 0)
      ).to.be.revertedWith("Limit must be greater than zero");

      await expect(
        trackAndTrace.getBatchEventsPaginated(tokenId, 1, 1)
      ).to.be.revertedWith("Offset out of range");

      await expect(
        trackAndTrace.getCustodyHistoryPaginated(tokenId, 1, 1)
      ).to.be.revertedWith("Offset out of range");
    });
  });

  describe("Pause Controls", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint a batch and record the tokenId
      const mintTx = await digitalBatch
        .connect(manufacturer1)
        .mintBatch(manufacturer1.address, sampleTokenURIs.batch1);
      const mintReceipt = await mintTx.wait();
      const mintEvent = mintReceipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "BatchMinted"
      );
      tokenId = mintEvent?.args?.tokenId;

      await trackAndTrace
        .connect(manufacturer1)
        .transferCustody(tokenId, distributor1.address);
    });

    it("Should allow owner to pause/unpause and block state-changing operations while paused", async function () {
      await trackAndTrace.connect(owner).pause();
      expect(await trackAndTrace.paused()).to.be.true;

      await expect(
        trackAndTrace.connect(distributor1).transferCustody(tokenId, pharmacist1.address)
      ).to.be.revertedWithCustomError(trackAndTrace, "EnforcedPause");

      await expect(
        trackAndTrace.connect(distributor1).logEvent(tokenId, eventData.temperature)
      ).to.be.revertedWithCustomError(trackAndTrace, "EnforcedPause");

      await trackAndTrace.connect(owner).unpause();
      expect(await trackAndTrace.paused()).to.be.false;

      await trackAndTrace
        .connect(distributor1)
        .transferCustody(tokenId, pharmacist1.address);
    });

    it("Should restrict pause/unpause to the contract owner", async function () {
      await expect(trackAndTrace.connect(distributor1).pause()).to.be.revertedWithCustomError(
        trackAndTrace,
        "OwnableUnauthorizedAccount"
      );

      await trackAndTrace.connect(owner).pause();

      await expect(trackAndTrace.connect(distributor1).unpause()).to.be.revertedWithCustomError(
        trackAndTrace,
        "OwnableUnauthorizedAccount"
      );

      await trackAndTrace.connect(owner).unpause();
    });
  });

  describe("Dependency Governance", function () {
    it("Should allow owner to update StakeholderRegistry address", async function () {
      const newRegistry = await ethers.deployContract("StakeholderRegistry");
      await newRegistry.waitForDeployment();

      await expect(
        trackAndTrace.connect(owner).updateStakeholderRegistry(await newRegistry.getAddress())
      )
        .to.emit(trackAndTrace, "StakeholderRegistryUpdated")
        .withArgs(await stakeholderRegistry.getAddress(), await newRegistry.getAddress());

      const storedRegistry = await trackAndTrace.stakeholderRegistry();
      expect(storedRegistry).to.equal(await newRegistry.getAddress());
    });

    it("Should prevent updating StakeholderRegistry with invalid or identical address", async function () {
      await expect(
        trackAndTrace.connect(owner).updateStakeholderRegistry(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid StakeholderRegistry address");

      await expect(
        trackAndTrace
          .connect(owner)
          .updateStakeholderRegistry(await stakeholderRegistry.getAddress())
      ).to.be.revertedWith("Registry already set");
    });

    it("Should allow owner to update DigitalBatch address", async function () {
      const registryAddress = await stakeholderRegistry.getAddress();
      const newDigitalBatch = await ethers.deployContract("DigitalBatch", [registryAddress]);
      await newDigitalBatch.waitForDeployment();

      await expect(
        trackAndTrace.connect(owner).updateDigitalBatch(await newDigitalBatch.getAddress())
      )
        .to.emit(trackAndTrace, "DigitalBatchUpdated")
        .withArgs(await digitalBatch.getAddress(), await newDigitalBatch.getAddress());

      const storedBatch = await trackAndTrace.digitalBatch();
      expect(storedBatch).to.equal(await newDigitalBatch.getAddress());
    });

    it("Should prevent non-owners from updating dependencies", async function () {
      const newRegistry = await ethers.deployContract("StakeholderRegistry");
      await newRegistry.waitForDeployment();

      await expect(
        trackAndTrace.connect(distributor1).updateStakeholderRegistry(await newRegistry.getAddress())
      ).to.be.revertedWithCustomError(trackAndTrace, "OwnableUnauthorizedAccount");

      const registryAddress = await stakeholderRegistry.getAddress();
      const newDigitalBatch = await ethers.deployContract("DigitalBatch", [registryAddress]);
      await newDigitalBatch.waitForDeployment();

      await expect(
        trackAndTrace.connect(distributor1).updateDigitalBatch(await newDigitalBatch.getAddress())
      ).to.be.revertedWithCustomError(trackAndTrace, "OwnableUnauthorizedAccount");
    });
  });
});
