import { expect } from "chai";
import { network } from "hardhat";
import type { StakeholderRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

describe("StakeholderRegistry", function () {
  let stakeholderRegistry: StakeholderRegistry;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  // Helper function to deploy a fresh contract before each test
  async function deployStakeholderRegistryFixture() {
    const [deployer, account1, account2, account3, account4] =
      await ethers.getSigners();

    const registry = await ethers.deployContract("StakeholderRegistry");
    await registry.waitForDeployment();

    return { registry, deployer, account1, account2, account3, account4 };
  }

  beforeEach(async function () {
    const fixture = await deployStakeholderRegistryFixture();
    stakeholderRegistry = fixture.registry;
    owner = fixture.deployer;
    addr1 = fixture.account1;
    addr2 = fixture.account2;
    addr3 = fixture.account3;
    nonOwner = fixture.account4;
  });

  describe("Deployment Tests", function () {
    it("Should deploy successfully", async function () {
      const address = await stakeholderRegistry.getAddress();
      expect(address).to.properAddress;
      expect(address).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the deployer as the owner", async function () {
      const contractOwner = await stakeholderRegistry.owner();
      expect(contractOwner).to.equal(
        owner.address,
        "Deployer should be set as the contract owner"
      );
    });

    it("Owner should have admin capabilities", async function () {
      // Owner should be able to add stakeholders without reverting
      await expect(
        stakeholderRegistry.connect(owner).addStakeholder(addr1.address, 1)
      ).to.not.be.revert(ethers);
    });
  });

  describe("addStakeholder Function - Success Cases", function () {
    it("Should allow owner to add a Manufacturer", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        manufacturerRole,
        "Address should have Manufacturer role"
      );
    });

    it("Should allow owner to add a Distributor", async function () {
      const distributorRole = 2; // Role.Distributor

      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, distributorRole);

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        distributorRole,
        "Address should have Distributor role"
      );
    });

    it("Should allow owner to add a Pharmacist", async function () {
      const pharmacistRole = 3; // Role.Pharmacist

      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, pharmacistRole);

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        pharmacistRole,
        "Address should have Pharmacist role"
      );
    });

    it("Should emit StakeholderAdded event with correct parameters", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      await expect(
        stakeholderRegistry
          .connect(owner)
          .addStakeholder(addr1.address, manufacturerRole)
      )
        .to.emit(stakeholderRegistry, "StakeholderAdded")
        .withArgs(addr1.address, manufacturerRole);
    });

    it("Should allow updating an existing stakeholder's role", async function () {
      const manufacturerRole = 1; // Role.Manufacturer
      const pharmacistRole = 3; // Role.Pharmacist

      // First, add as Manufacturer
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);

      let role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(manufacturerRole, "Should initially be Manufacturer");

      // Update to Pharmacist
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, pharmacistRole);

      role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(pharmacistRole, "Should be updated to Pharmacist");
    });
  });

  describe("Role admin delegation", function () {
    const manufacturerRole = 1; // Role.Manufacturer
    const distributorRole = 2; // Role.Distributor

    it("Should allow owner to assign and query role admin", async function () {
      await expect(
        stakeholderRegistry
          .connect(owner)
          .setRoleAdmin(manufacturerRole, addr2.address)
      )
        .to.emit(stakeholderRegistry, "RoleAdminUpdated")
        .withArgs(manufacturerRole, ethers.ZeroAddress, addr2.address);

      expect(await stakeholderRegistry.getRoleAdmin(manufacturerRole)).to.equal(
        addr2.address
      );
    });

    it("Should allow role admin to add stakeholders for their role", async function () {
      await stakeholderRegistry
        .connect(owner)
        .setRoleAdmin(manufacturerRole, addr2.address);

      await stakeholderRegistry
        .connect(addr2)
        .addStakeholder(addr1.address, manufacturerRole);

      expect(await stakeholderRegistry.getRole(addr1.address)).to.equal(
        manufacturerRole
      );
    });

    it("Should prevent role admin from assigning different role", async function () {
      await stakeholderRegistry
        .connect(owner)
        .setRoleAdmin(manufacturerRole, addr2.address);

      await expect(
        stakeholderRegistry
          .connect(addr2)
          .addStakeholder(addr1.address, distributorRole)
      ).to.be.revertedWith("Unauthorized role admin");
    });

    it("Should allow owner to clear role admin", async function () {
      await stakeholderRegistry
        .connect(owner)
        .setRoleAdmin(manufacturerRole, addr2.address);

      await stakeholderRegistry
        .connect(owner)
        .setRoleAdmin(manufacturerRole, ethers.ZeroAddress);

      expect(await stakeholderRegistry.getRoleAdmin(manufacturerRole)).to.equal(
        ethers.ZeroAddress
      );

      await expect(
        stakeholderRegistry
          .connect(addr2)
          .addStakeholder(addr1.address, manufacturerRole)
      ).to.be.revertedWith("Unauthorized role admin");
    });
  });

  describe("removeStakeholder Function", function () {
    const manufacturerRole = 1; // Role.Manufacturer

    beforeEach(async function () {
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);
    });

    it("Should allow owner to remove stakeholder", async function () {
      await expect(stakeholderRegistry.connect(owner).removeStakeholder(addr1.address))
        .to.emit(stakeholderRegistry, "StakeholderRemoved")
        .withArgs(addr1.address, manufacturerRole);

      expect(await stakeholderRegistry.getRole(addr1.address)).to.equal(0);
    });

    it("Should allow role admin to remove stakeholder", async function () {
      await stakeholderRegistry
        .connect(owner)
        .setRoleAdmin(manufacturerRole, addr2.address);

      await stakeholderRegistry.connect(addr2).removeStakeholder(addr1.address);

      expect(await stakeholderRegistry.getRole(addr1.address)).to.equal(0);
    });

    it("Should revert when removing unregistered stakeholder", async function () {
      await stakeholderRegistry
        .connect(owner)
        .removeStakeholder(addr1.address);

      await expect(
        stakeholderRegistry.connect(owner).removeStakeholder(addr1.address)
      ).to.be.revertedWith("Stakeholder not registered");
    });

    it("Should restrict removal to owner or role admin", async function () {
      await expect(
        stakeholderRegistry.connect(nonOwner).removeStakeholder(addr1.address)
      ).to.be.revertedWith("Unauthorized role admin");
    });
  });

  describe("addStakeholder Function - Failure Cases", function () {
    it("Should revert when non-owner admin tries to add stakeholder without privileges", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      await expect(
        stakeholderRegistry
          .connect(nonOwner)
          .addStakeholder(addr1.address, manufacturerRole)
      ).to.be.revertedWith("Unauthorized role admin");
    });

    it("Should revert when trying to add zero address", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      await expect(
        stakeholderRegistry
          .connect(owner)
          .addStakeholder(ethers.ZeroAddress, manufacturerRole)
      ).to.be.revertedWith("Invalid stakeholder address");
    });

    it("Should revert when trying to set role to None", async function () {
      const noneRole = 0; // Role.None

      await expect(
        stakeholderRegistry
          .connect(owner)
          .addStakeholder(addr1.address, noneRole)
      ).to.be.revertedWith("Invalid role");
    });
  });

  describe("getRole Function Tests", function () {
    it("Should return correct role for registered Manufacturer", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        manufacturerRole,
        "Should return Manufacturer role"
      );
    });

    it("Should return correct role for registered Distributor", async function () {
      const distributorRole = 2; // Role.Distributor

      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, distributorRole);

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        distributorRole,
        "Should return Distributor role"
      );
    });

    it("Should return correct role for registered Pharmacist", async function () {
      const pharmacistRole = 3; // Role.Pharmacist

      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, pharmacistRole);

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        pharmacistRole,
        "Should return Pharmacist role"
      );
    });

    it("Should return None for unregistered address", async function () {
      const noneRole = 0; // Role.None

      const role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(
        noneRole,
        "Unregistered address should have None role"
      );
    });

    it("Should return updated role after role change", async function () {
      const manufacturerRole = 1; // Role.Manufacturer
      const distributorRole = 2; // Role.Distributor

      // Add as Manufacturer
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);

      let role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(manufacturerRole, "Should initially be Manufacturer");

      // Update to Distributor
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, distributorRole);

      role = await stakeholderRegistry.getRole(addr1.address);
      expect(role).to.equal(distributorRole, "Should be updated to Distributor");
    });
  });

  describe("Ownable Integration Tests", function () {
    it("Should allow owner to transfer ownership", async function () {
      await expect(
        stakeholderRegistry.connect(owner).transferOwnership(addr1.address)
      ).to.not.be.revert(ethers);

      const newOwner = await stakeholderRegistry.owner();
      expect(newOwner).to.equal(
        addr1.address,
        "Ownership should be transferred to addr1"
      );
    });

    it("Should allow new owner to add stakeholders after transfer", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      // Transfer ownership
      await stakeholderRegistry
        .connect(owner)
        .transferOwnership(addr1.address);

      // New owner should be able to add stakeholders
      await expect(
        stakeholderRegistry
          .connect(addr1)
          .addStakeholder(addr2.address, manufacturerRole)
      ).to.not.be.revert(ethers);

      const role = await stakeholderRegistry.getRole(addr2.address);
      expect(role).to.equal(
        manufacturerRole,
        "New owner should successfully add stakeholder"
      );
    });

    it("Should prevent old owner from adding stakeholders after transfer", async function () {
      const manufacturerRole = 1; // Role.Manufacturer

      // Transfer ownership
      await stakeholderRegistry
        .connect(owner)
        .transferOwnership(addr1.address);

      // Old owner should not be able to add stakeholders
      await expect(
        stakeholderRegistry
          .connect(owner)
          .addStakeholder(addr2.address, manufacturerRole)
      ).to.be.revertedWith("Unauthorized role admin");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple stakeholders being added", async function () {
      const manufacturerRole = 1; // Role.Manufacturer
      const distributorRole = 2; // Role.Distributor
      const pharmacistRole = 3; // Role.Pharmacist

      // Add multiple stakeholders
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr2.address, distributorRole);
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr3.address, pharmacistRole);

      // Verify all roles are correctly set
      expect(await stakeholderRegistry.getRole(addr1.address)).to.equal(
        manufacturerRole,
        "addr1 should be Manufacturer"
      );
      expect(await stakeholderRegistry.getRole(addr2.address)).to.equal(
        distributorRole,
        "addr2 should be Distributor"
      );
      expect(await stakeholderRegistry.getRole(addr3.address)).to.equal(
        pharmacistRole,
        "addr3 should be Pharmacist"
      );
    });

    it("Should correctly overwrite existing stakeholder role", async function () {
      const manufacturerRole = 1; // Role.Manufacturer
      const distributorRole = 2; // Role.Distributor
      const pharmacistRole = 3; // Role.Pharmacist

      // Add as Manufacturer
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);

      // Update to Distributor
      await expect(
        stakeholderRegistry
          .connect(owner)
          .addStakeholder(addr1.address, distributorRole)
      )
        .to.emit(stakeholderRegistry, "StakeholderAdded")
        .withArgs(addr1.address, distributorRole);

      expect(await stakeholderRegistry.getRole(addr1.address)).to.equal(
        distributorRole,
        "Role should be updated to Distributor"
      );

      // Update to Pharmacist
      await expect(
        stakeholderRegistry
          .connect(owner)
          .addStakeholder(addr1.address, pharmacistRole)
      )
        .to.emit(stakeholderRegistry, "StakeholderAdded")
        .withArgs(addr1.address, pharmacistRole);

      expect(await stakeholderRegistry.getRole(addr1.address)).to.equal(
        pharmacistRole,
        "Role should be updated to Pharmacist"
      );
    });

    it("Should handle querying multiple addresses", async function () {
      const manufacturerRole = 1; // Role.Manufacturer
      const noneRole = 0; // Role.None

      // Add one stakeholder
      await stakeholderRegistry
        .connect(owner)
        .addStakeholder(addr1.address, manufacturerRole);

      // Query multiple addresses
      const role1 = await stakeholderRegistry.getRole(addr1.address);
      const role2 = await stakeholderRegistry.getRole(addr2.address);
      const role3 = await stakeholderRegistry.getRole(addr3.address);

      expect(role1).to.equal(
        manufacturerRole,
        "Registered address should have Manufacturer role"
      );
      expect(role2).to.equal(
        noneRole,
        "Unregistered address should have None role"
      );
      expect(role3).to.equal(
        noneRole,
        "Unregistered address should have None role"
      );
    });
  });
});
