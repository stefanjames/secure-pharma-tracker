import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { PharmaChain } from "../contracts/typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// Mirror of Solidity Status enum
const Status = {
  Created: 0,
  InTransit: 1,
  Delivered: 2,
  QATesting: 3,
  Approved: 4,
  Rejected: 5,
  Recalled: 6,
} as const;

describe("PharmaChain", function () {
  // ═══════════════════════════════════════════════════════════════════════
  //  Fixtures
  // ═══════════════════════════════════════════════════════════════════════

  async function deployFixture() {
    const [admin, manufacturer, logistics, tester, regulator, outsider, extra] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PharmaChain");
    const pharma = (await Factory.deploy()) as unknown as PharmaChain;

    const MANUFACTURER_ROLE = await pharma.MANUFACTURER_ROLE();
    const LOGISTICS_ROLE = await pharma.LOGISTICS_ROLE();
    const TESTER_ROLE = await pharma.TESTER_ROLE();
    const REGULATOR_ROLE = await pharma.REGULATOR_ROLE();
    const DEFAULT_ADMIN_ROLE = await pharma.DEFAULT_ADMIN_ROLE();

    await pharma.grantRole(MANUFACTURER_ROLE, manufacturer.address);
    await pharma.grantRole(LOGISTICS_ROLE, logistics.address);
    await pharma.grantRole(TESTER_ROLE, tester.address);
    await pharma.grantRole(REGULATOR_ROLE, regulator.address);

    return {
      pharma,
      admin,
      manufacturer,
      logistics,
      tester,
      regulator,
      outsider,
      extra,
      MANUFACTURER_ROLE,
      LOGISTICS_ROLE,
      TESTER_ROLE,
      REGULATOR_ROLE,
      DEFAULT_ADMIN_ROLE,
    };
  }

  /** Batch 1 exists in Created status, holder = manufacturer */
  async function createdFixture() {
    const ctx = await deployFixture();
    await ctx.pharma.connect(ctx.manufacturer).createBatch("Aspirin");
    return ctx;
  }

  /** Batch 1 in InTransit status, holder = logistics */
  async function inTransitFixture() {
    const ctx = await createdFixture();
    await ctx.pharma
      .connect(ctx.manufacturer)
      .shipBatch(1, ctx.logistics.address);
    return ctx;
  }

  /** Batch 1 in Delivered status, holder = extra */
  async function deliveredFixture() {
    const ctx = await inTransitFixture();
    await ctx.pharma
      .connect(ctx.logistics)
      .deliverBatch(1, ctx.extra.address);
    return ctx;
  }

  /** Batch 1 in QATesting status, holder = tester */
  async function qaTestingFixture() {
    const ctx = await deliveredFixture();
    await ctx.pharma.connect(ctx.tester).beginQATesting(1);
    return ctx;
  }

  /** Batch 1 in Approved status (terminal), holder = tester */
  async function approvedFixture() {
    const ctx = await qaTestingFixture();
    await ctx.pharma.connect(ctx.tester).approveBatch(1);
    return ctx;
  }

  /** Batch 1 in Rejected status (terminal), holder = tester */
  async function rejectedFixture() {
    const ctx = await qaTestingFixture();
    await ctx.pharma.connect(ctx.tester).rejectBatch(1);
    return ctx;
  }

  /** Batch 1 in Recalled status (terminal), holder = regulator */
  async function recalledFixture() {
    const ctx = await createdFixture();
    await ctx.pharma.connect(ctx.regulator).recallBatch(1);
    return ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Deployment
  // ═══════════════════════════════════════════════════════════════════════

  describe("Deployment", function () {
    it("grants DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { pharma, admin, DEFAULT_ADMIN_ROLE } =
        await loadFixture(deployFixture);
      expect(await pharma.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be
        .true;
    });

    it("does not grant admin role to non-deployers", async function () {
      const { pharma, outsider, DEFAULT_ADMIN_ROLE } =
        await loadFixture(deployFixture);
      expect(await pharma.hasRole(DEFAULT_ADMIN_ROLE, outsider.address)).to.be
        .false;
    });

    it("starts with zero batch count", async function () {
      const { pharma } = await loadFixture(deployFixture);
      expect(await pharma.batchCount()).to.equal(0);
    });

    it("role constants match expected keccak256 values", async function () {
      const { pharma } = await loadFixture(deployFixture);
      expect(await pharma.MANUFACTURER_ROLE()).to.equal(
        ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE"))
      );
      expect(await pharma.LOGISTICS_ROLE()).to.equal(
        ethers.keccak256(ethers.toUtf8Bytes("LOGISTICS_ROLE"))
      );
      expect(await pharma.TESTER_ROLE()).to.equal(
        ethers.keccak256(ethers.toUtf8Bytes("TESTER_ROLE"))
      );
      expect(await pharma.REGULATOR_ROLE()).to.equal(
        ethers.keccak256(ethers.toUtf8Bytes("REGULATOR_ROLE"))
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  Role-Based Access Control
  // ═══════════════════════════════════════════════════════════════════════

  describe("Role-Based Access Control", function () {
    describe("Admin role management", function () {
      it("admin can grant a role", async function () {
        const { pharma, outsider, MANUFACTURER_ROLE } =
          await loadFixture(deployFixture);
        await pharma.grantRole(MANUFACTURER_ROLE, outsider.address);
        expect(await pharma.hasRole(MANUFACTURER_ROLE, outsider.address)).to.be
          .true;
      });

      it("admin can revoke a role", async function () {
        const { pharma, manufacturer, MANUFACTURER_ROLE } =
          await loadFixture(deployFixture);
        await pharma.revokeRole(MANUFACTURER_ROLE, manufacturer.address);
        expect(await pharma.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to
          .be.false;
      });

      it("non-admin cannot grant roles", async function () {
        const { pharma, outsider, MANUFACTURER_ROLE, DEFAULT_ADMIN_ROLE } =
          await loadFixture(deployFixture);
        await expect(
          pharma
            .connect(outsider)
            .grantRole(MANUFACTURER_ROLE, outsider.address)
        )
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, DEFAULT_ADMIN_ROLE);
      });

      it("non-admin cannot revoke roles", async function () {
        const {
          pharma,
          manufacturer,
          outsider,
          MANUFACTURER_ROLE,
          DEFAULT_ADMIN_ROLE,
        } = await loadFixture(deployFixture);
        await expect(
          pharma
            .connect(outsider)
            .revokeRole(MANUFACTURER_ROLE, manufacturer.address)
        )
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, DEFAULT_ADMIN_ROLE);
      });
    });

    describe("Unauthorized function access", function () {
      it("createBatch reverts without MANUFACTURER_ROLE", async function () {
        const { pharma, outsider, MANUFACTURER_ROLE } =
          await loadFixture(deployFixture);
        await expect(pharma.connect(outsider).createBatch("Drug"))
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, MANUFACTURER_ROLE);
      });

      it("shipBatch reverts without MANUFACTURER_ROLE", async function () {
        const { pharma, logistics, outsider, MANUFACTURER_ROLE } =
          await loadFixture(createdFixture);
        await expect(
          pharma.connect(outsider).shipBatch(1, logistics.address)
        )
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, MANUFACTURER_ROLE);
      });

      it("deliverBatch reverts without LOGISTICS_ROLE", async function () {
        const { pharma, outsider, extra, LOGISTICS_ROLE } =
          await loadFixture(inTransitFixture);
        await expect(
          pharma.connect(outsider).deliverBatch(1, extra.address)
        )
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, LOGISTICS_ROLE);
      });

      it("beginQATesting reverts without TESTER_ROLE", async function () {
        const { pharma, outsider, TESTER_ROLE } =
          await loadFixture(deliveredFixture);
        await expect(pharma.connect(outsider).beginQATesting(1))
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, TESTER_ROLE);
      });

      it("approveBatch reverts without TESTER_ROLE", async function () {
        const { pharma, outsider, TESTER_ROLE } =
          await loadFixture(qaTestingFixture);
        await expect(pharma.connect(outsider).approveBatch(1))
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, TESTER_ROLE);
      });

      it("rejectBatch reverts without TESTER_ROLE", async function () {
        const { pharma, outsider, TESTER_ROLE } =
          await loadFixture(qaTestingFixture);
        await expect(pharma.connect(outsider).rejectBatch(1))
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, TESTER_ROLE);
      });

      it("recallBatch reverts without REGULATOR_ROLE", async function () {
        const { pharma, outsider, REGULATOR_ROLE } =
          await loadFixture(createdFixture);
        await expect(pharma.connect(outsider).recallBatch(1))
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, REGULATOR_ROLE);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  Batch Creation
  // ═══════════════════════════════════════════════════════════════════════

  describe("Batch Creation", function () {
    it("creates a batch with correct fields", async function () {
      const { pharma, manufacturer } = await loadFixture(deployFixture);
      await pharma.connect(manufacturer).createBatch("Aspirin");

      const batch = await pharma.getBatch(1);
      expect(batch.batchId).to.equal(1);
      expect(batch.drugName).to.equal("Aspirin");
      expect(batch.manufacturer).to.equal(manufacturer.address);
      expect(batch.currentHolder).to.equal(manufacturer.address);
      expect(batch.status).to.equal(Status.Created);
      expect(batch.createdAt).to.be.gt(0);
      expect(batch.updatedAt).to.equal(batch.createdAt);
    });

    it("increments batchCount", async function () {
      const { pharma, manufacturer } = await loadFixture(deployFixture);
      expect(await pharma.batchCount()).to.equal(0);

      await pharma.connect(manufacturer).createBatch("Drug A");
      expect(await pharma.batchCount()).to.equal(1);

      await pharma.connect(manufacturer).createBatch("Drug B");
      expect(await pharma.batchCount()).to.equal(2);
    });

    it("assigns sequential IDs to multiple batches", async function () {
      const { pharma, manufacturer } = await loadFixture(deployFixture);
      await pharma.connect(manufacturer).createBatch("Drug A");
      await pharma.connect(manufacturer).createBatch("Drug B");
      await pharma.connect(manufacturer).createBatch("Drug C");

      expect((await pharma.getBatch(1)).drugName).to.equal("Drug A");
      expect((await pharma.getBatch(2)).drugName).to.equal("Drug B");
      expect((await pharma.getBatch(3)).drugName).to.equal("Drug C");
    });

    it("emits BatchCreated with correct parameters", async function () {
      const { pharma, manufacturer } = await loadFixture(deployFixture);
      const tx = pharma.connect(manufacturer).createBatch("Aspirin");

      await expect(tx)
        .to.emit(pharma, "BatchCreated")
        .withArgs(1, "Aspirin", manufacturer.address, () => true);
    });

    it("returns the batchId", async function () {
      const { pharma, manufacturer } = await loadFixture(deployFixture);
      const id = await pharma
        .connect(manufacturer)
        .createBatch.staticCall("Aspirin");
      expect(id).to.equal(1);
    });

    it("reverts on empty drug name", async function () {
      const { pharma, manufacturer } = await loadFixture(deployFixture);
      await expect(
        pharma.connect(manufacturer).createBatch("")
      ).to.be.revertedWithCustomError(pharma, "EmptyDrugName");
    });

    it("allows different manufacturers to create batches", async function () {
      const { pharma, admin, outsider, MANUFACTURER_ROLE } =
        await loadFixture(deployFixture);
      await pharma.grantRole(MANUFACTURER_ROLE, outsider.address);

      await pharma.connect(outsider).createBatch("Drug X");
      const batch = await pharma.getBatch(1);
      expect(batch.manufacturer).to.equal(outsider.address);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  Valid State Transitions
  // ═══════════════════════════════════════════════════════════════════════

  describe("Valid State Transitions", function () {
    // ─── shipBatch: Created → InTransit ──────────────────────────────

    describe("shipBatch (Created → InTransit)", function () {
      it("transitions status to InTransit", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(createdFixture);
        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);

        const batch = await pharma.getBatch(1);
        expect(batch.status).to.equal(Status.InTransit);
      });

      it("transfers holder to logistics provider", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(createdFixture);
        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);

        const batch = await pharma.getBatch(1);
        expect(batch.currentHolder).to.equal(logistics.address);
      });

      it("updates the updatedAt timestamp", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(createdFixture);
        const before = (await pharma.getBatch(1)).updatedAt;

        await ethers.provider.send("evm_increaseTime", [60]);
        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);

        const after = (await pharma.getBatch(1)).updatedAt;
        expect(after).to.be.gt(before);
      });

      it("emits BatchTransitioned with correct parameters", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(createdFixture);

        await expect(
          pharma.connect(manufacturer).shipBatch(1, logistics.address)
        )
          .to.emit(pharma, "BatchTransitioned")
          .withArgs(
            1,
            Status.Created,
            Status.InTransit,
            manufacturer.address,
            () => true
          );
      });

      it("reverts if recipient lacks LOGISTICS_ROLE", async function () {
        const { pharma, manufacturer, outsider, LOGISTICS_ROLE } =
          await loadFixture(createdFixture);
        await expect(
          pharma.connect(manufacturer).shipBatch(1, outsider.address)
        )
          .to.be.revertedWithCustomError(pharma, "RecipientMissingRole")
          .withArgs(outsider.address, LOGISTICS_ROLE);
      });

      it("reverts if caller is not the current holder", async function () {
        const { pharma, admin, logistics, MANUFACTURER_ROLE } =
          await loadFixture(createdFixture);
        // Give admin MANUFACTURER_ROLE so they pass the role check
        await pharma.grantRole(MANUFACTURER_ROLE, admin.address);

        await expect(
          pharma.connect(admin).shipBatch(1, logistics.address)
        )
          .to.be.revertedWithCustomError(pharma, "NotCurrentHolder")
          .withArgs(admin.address, () => true);
      });
    });

    // ─── deliverBatch: InTransit → Delivered ─────────────────────────

    describe("deliverBatch (InTransit → Delivered)", function () {
      it("transitions status to Delivered", async function () {
        const { pharma, logistics, extra } =
          await loadFixture(inTransitFixture);
        await pharma.connect(logistics).deliverBatch(1, extra.address);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Delivered);
      });

      it("transfers holder to destination", async function () {
        const { pharma, logistics, extra } =
          await loadFixture(inTransitFixture);
        await pharma.connect(logistics).deliverBatch(1, extra.address);

        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          extra.address
        );
      });

      it("emits BatchTransitioned", async function () {
        const { pharma, logistics, extra } =
          await loadFixture(inTransitFixture);

        await expect(
          pharma.connect(logistics).deliverBatch(1, extra.address)
        )
          .to.emit(pharma, "BatchTransitioned")
          .withArgs(
            1,
            Status.InTransit,
            Status.Delivered,
            logistics.address,
            () => true
          );
      });

      it("reverts if caller is not the current holder", async function () {
        const { pharma, admin, extra, LOGISTICS_ROLE } =
          await loadFixture(inTransitFixture);
        await pharma.grantRole(LOGISTICS_ROLE, admin.address);

        await expect(
          pharma.connect(admin).deliverBatch(1, extra.address)
        )
          .to.be.revertedWithCustomError(pharma, "NotCurrentHolder")
          .withArgs(admin.address, () => true);
      });

      it("allows delivery to any address (no role check on destination)", async function () {
        const { pharma, logistics, outsider } =
          await loadFixture(inTransitFixture);
        await pharma
          .connect(logistics)
          .deliverBatch(1, outsider.address);

        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          outsider.address
        );
      });
    });

    // ─── beginQATesting: Delivered → QATesting ───────────────────────

    describe("beginQATesting (Delivered → QATesting)", function () {
      it("transitions status to QATesting", async function () {
        const { pharma, tester } = await loadFixture(deliveredFixture);
        await pharma.connect(tester).beginQATesting(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.QATesting);
      });

      it("sets tester as new holder (no onlyHolder check)", async function () {
        const { pharma, tester, extra } =
          await loadFixture(deliveredFixture);
        // holder is `extra` after delivery, but beginQATesting has no onlyHolder
        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          extra.address
        );

        await pharma.connect(tester).beginQATesting(1);
        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          tester.address
        );
      });

      it("emits BatchTransitioned", async function () {
        const { pharma, tester } = await loadFixture(deliveredFixture);

        await expect(pharma.connect(tester).beginQATesting(1))
          .to.emit(pharma, "BatchTransitioned")
          .withArgs(
            1,
            Status.Delivered,
            Status.QATesting,
            tester.address,
            () => true
          );
      });

      it("allows any tester to begin QA (not just holder)", async function () {
        const { pharma, admin, tester, extra, TESTER_ROLE } =
          await loadFixture(deliveredFixture);
        // extra is the holder, but a completely different tester can start QA
        const anotherTester = admin;
        await pharma.grantRole(TESTER_ROLE, anotherTester.address);

        await pharma.connect(anotherTester).beginQATesting(1);
        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          anotherTester.address
        );
      });
    });

    // ─── approveBatch: QATesting → Approved ──────────────────────────

    describe("approveBatch (QATesting → Approved)", function () {
      it("transitions status to Approved", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);
        await pharma.connect(tester).approveBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Approved);
      });

      it("emits BatchTransitioned", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);

        await expect(pharma.connect(tester).approveBatch(1))
          .to.emit(pharma, "BatchTransitioned")
          .withArgs(
            1,
            Status.QATesting,
            Status.Approved,
            tester.address,
            () => true
          );
      });

      it("reverts if caller is not the current holder", async function () {
        const { pharma, admin, TESTER_ROLE } =
          await loadFixture(qaTestingFixture);
        await pharma.grantRole(TESTER_ROLE, admin.address);

        await expect(pharma.connect(admin).approveBatch(1))
          .to.be.revertedWithCustomError(pharma, "NotCurrentHolder")
          .withArgs(admin.address, () => true);
      });
    });

    // ─── rejectBatch: QATesting → Rejected ───────────────────────────

    describe("rejectBatch (QATesting → Rejected)", function () {
      it("transitions status to Rejected", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);
        await pharma.connect(tester).rejectBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Rejected);
      });

      it("emits BatchTransitioned", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);

        await expect(pharma.connect(tester).rejectBatch(1))
          .to.emit(pharma, "BatchTransitioned")
          .withArgs(
            1,
            Status.QATesting,
            Status.Rejected,
            tester.address,
            () => true
          );
      });

      it("reverts if caller is not the current holder", async function () {
        const { pharma, admin, TESTER_ROLE } =
          await loadFixture(qaTestingFixture);
        await pharma.grantRole(TESTER_ROLE, admin.address);

        await expect(pharma.connect(admin).rejectBatch(1))
          .to.be.revertedWithCustomError(pharma, "NotCurrentHolder")
          .withArgs(admin.address, () => true);
      });
    });

    // ─── recallBatch: any non-terminal → Recalled ────────────────────

    describe("recallBatch (non-terminal → Recalled)", function () {
      it("recalls from Created", async function () {
        const { pharma, regulator } = await loadFixture(createdFixture);
        await pharma.connect(regulator).recallBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Recalled);
      });

      it("recalls from InTransit", async function () {
        const { pharma, regulator } = await loadFixture(inTransitFixture);
        await pharma.connect(regulator).recallBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Recalled);
      });

      it("recalls from Delivered", async function () {
        const { pharma, regulator } = await loadFixture(deliveredFixture);
        await pharma.connect(regulator).recallBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Recalled);
      });

      it("recalls from QATesting", async function () {
        const { pharma, regulator } = await loadFixture(qaTestingFixture);
        await pharma.connect(regulator).recallBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Recalled);
      });

      it("sets regulator as holder", async function () {
        const { pharma, regulator } = await loadFixture(createdFixture);
        await pharma.connect(regulator).recallBatch(1);

        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          regulator.address
        );
      });

      it("emits BatchTransitioned with original status", async function () {
        const { pharma, regulator } = await loadFixture(inTransitFixture);

        await expect(pharma.connect(regulator).recallBatch(1))
          .to.emit(pharma, "BatchTransitioned")
          .withArgs(
            1,
            Status.InTransit,
            Status.Recalled,
            regulator.address,
            () => true
          );
      });
    });

    // ─── Full lifecycle ──────────────────────────────────────────────

    describe("Full lifecycle (happy path)", function () {
      it("walks Created → InTransit → Delivered → QATesting → Approved", async function () {
        const { pharma, manufacturer, logistics, tester, extra } =
          await loadFixture(createdFixture);

        // Created → InTransit
        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);
        expect((await pharma.getBatch(1)).status).to.equal(Status.InTransit);

        // InTransit → Delivered
        await pharma.connect(logistics).deliverBatch(1, extra.address);
        expect((await pharma.getBatch(1)).status).to.equal(Status.Delivered);

        // Delivered → QATesting
        await pharma.connect(tester).beginQATesting(1);
        expect((await pharma.getBatch(1)).status).to.equal(Status.QATesting);

        // QATesting → Approved
        await pharma.connect(tester).approveBatch(1);
        expect((await pharma.getBatch(1)).status).to.equal(Status.Approved);
      });

      it("walks Created → InTransit → Delivered → QATesting → Rejected", async function () {
        const { pharma, manufacturer, logistics, tester, extra } =
          await loadFixture(createdFixture);

        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);
        await pharma.connect(logistics).deliverBatch(1, extra.address);
        await pharma.connect(tester).beginQATesting(1);
        await pharma.connect(tester).rejectBatch(1);

        expect((await pharma.getBatch(1)).status).to.equal(Status.Rejected);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  Invalid State Transitions
  // ═══════════════════════════════════════════════════════════════════════

  describe("Invalid State Transitions", function () {
    // ─── shipBatch requires Created ──────────────────────────────────

    describe("shipBatch rejects wrong source status", function () {
      it("reverts from Delivered (InvalidStateTransition)", async function () {
        // To test _requireStatus revert: manufacturer must be holder + wrong status.
        // Create → Ship → logistics delivers BACK to manufacturer → status=Delivered, holder=manufacturer.
        const { pharma, manufacturer, logistics, LOGISTICS_ROLE } =
          await loadFixture(createdFixture);

        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);
        await pharma
          .connect(logistics)
          .deliverBatch(1, manufacturer.address);

        // Now manufacturer is holder, status = Delivered
        await expect(
          pharma.connect(manufacturer).shipBatch(1, logistics.address)
        )
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Delivered, Status.InTransit);
      });

      it("reverts when not holder (NotCurrentHolder)", async function () {
        // After shipping, manufacturer is no longer the holder
        const { pharma, manufacturer, logistics } =
          await loadFixture(inTransitFixture);

        await expect(
          pharma.connect(manufacturer).shipBatch(1, logistics.address)
        )
          .to.be.revertedWithCustomError(pharma, "NotCurrentHolder")
          .withArgs(manufacturer.address, logistics.address);
      });
    });

    // ─── deliverBatch requires InTransit ─────────────────────────────

    describe("deliverBatch rejects wrong source status", function () {
      it("reverts from Created (InvalidStateTransition)", async function () {
        // Give manufacturer LOGISTICS_ROLE so they pass the role check.
        // Manufacturer is holder at Created status.
        const { pharma, manufacturer, extra, LOGISTICS_ROLE } =
          await loadFixture(createdFixture);
        await pharma.grantRole(LOGISTICS_ROLE, manufacturer.address);

        await expect(
          pharma.connect(manufacturer).deliverBatch(1, extra.address)
        )
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Created, Status.Delivered);
      });

      it("reverts when not holder (NotCurrentHolder)", async function () {
        const { pharma, admin, extra, LOGISTICS_ROLE } =
          await loadFixture(inTransitFixture);
        await pharma.grantRole(LOGISTICS_ROLE, admin.address);

        await expect(
          pharma.connect(admin).deliverBatch(1, extra.address)
        )
          .to.be.revertedWithCustomError(pharma, "NotCurrentHolder")
          .withArgs(admin.address, () => true);
      });
    });

    // ─── beginQATesting requires Delivered ───────────────────────────

    describe("beginQATesting rejects wrong source status", function () {
      it("reverts from Created", async function () {
        const { pharma, tester } = await loadFixture(createdFixture);
        await expect(pharma.connect(tester).beginQATesting(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Created, Status.QATesting);
      });

      it("reverts from InTransit", async function () {
        const { pharma, tester } = await loadFixture(inTransitFixture);
        await expect(pharma.connect(tester).beginQATesting(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.InTransit, Status.QATesting);
      });

      it("reverts from QATesting (already in QA)", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);
        await expect(pharma.connect(tester).beginQATesting(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.QATesting, Status.QATesting);
      });
    });

    // ─── approveBatch requires QATesting ─────────────────────────────

    describe("approveBatch rejects wrong source status", function () {
      it("reverts from Delivered (tester is holder via deliverBatch)", async function () {
        // Deliver directly to tester so tester is holder at Delivered status.
        const { pharma, logistics, tester } =
          await loadFixture(inTransitFixture);
        await pharma
          .connect(logistics)
          .deliverBatch(1, tester.address);

        await expect(pharma.connect(tester).approveBatch(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Delivered, Status.Approved);
      });
    });

    // ─── rejectBatch requires QATesting ──────────────────────────────

    describe("rejectBatch rejects wrong source status", function () {
      it("reverts from Delivered (tester is holder via deliverBatch)", async function () {
        const { pharma, logistics, tester } =
          await loadFixture(inTransitFixture);
        await pharma
          .connect(logistics)
          .deliverBatch(1, tester.address);

        await expect(pharma.connect(tester).rejectBatch(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Delivered, Status.Rejected);
      });
    });

    // ─── recallBatch rejects terminal states ─────────────────────────

    describe("recallBatch rejects terminal states", function () {
      it("reverts from Approved", async function () {
        const { pharma, regulator } = await loadFixture(approvedFixture);
        await expect(pharma.connect(regulator).recallBatch(1))
          .to.be.revertedWithCustomError(pharma, "TerminalState")
          .withArgs(1, Status.Approved);
      });

      it("reverts from Rejected", async function () {
        const { pharma, regulator } = await loadFixture(rejectedFixture);
        await expect(pharma.connect(regulator).recallBatch(1))
          .to.be.revertedWithCustomError(pharma, "TerminalState")
          .withArgs(1, Status.Rejected);
      });

      it("reverts from Recalled (already recalled)", async function () {
        const { pharma, regulator } = await loadFixture(recalledFixture);
        await expect(pharma.connect(regulator).recallBatch(1))
          .to.be.revertedWithCustomError(pharma, "TerminalState")
          .withArgs(1, Status.Recalled);
      });
    });

    // ─── Operations on terminal batches ──────────────────────────────

    describe("No transitions possible from terminal states", function () {
      it("shipBatch reverts on Approved batch (holder mismatch)", async function () {
        const { pharma, manufacturer, logistics, MANUFACTURER_ROLE } =
          await loadFixture(approvedFixture);
        // tester is holder after approval, so manufacturer fails onlyHolder
        await expect(
          pharma.connect(manufacturer).shipBatch(1, logistics.address)
        ).to.be.revertedWithCustomError(pharma, "NotCurrentHolder");
      });

      it("beginQATesting reverts on Approved batch", async function () {
        const { pharma, tester } = await loadFixture(approvedFixture);
        await expect(pharma.connect(tester).beginQATesting(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Approved, Status.QATesting);
      });

      it("beginQATesting reverts on Rejected batch", async function () {
        const { pharma, tester } = await loadFixture(rejectedFixture);
        await expect(pharma.connect(tester).beginQATesting(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Rejected, Status.QATesting);
      });

      it("beginQATesting reverts on Recalled batch", async function () {
        const { pharma, tester } = await loadFixture(recalledFixture);
        await expect(pharma.connect(tester).beginQATesting(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Recalled, Status.QATesting);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  Temperature Logging
  // ═══════════════════════════════════════════════════════════════════════

  describe("Temperature Logging", function () {
    it("logistics can record temperature", async function () {
      const { pharma, logistics } = await loadFixture(inTransitFixture);
      await pharma.connect(logistics).recordTemperature(1, 365);

      const logs = await pharma.getTemperatureLogs(1);
      expect(logs.length).to.equal(1);
      expect(logs[0].temperatureCelsius).to.equal(365);
      expect(logs[0].recorder).to.equal(logistics.address);
    });

    it("tester can record temperature", async function () {
      const { pharma, tester } = await loadFixture(qaTestingFixture);
      await pharma.connect(tester).recordTemperature(1, 200);

      const logs = await pharma.getTemperatureLogs(1);
      expect(logs.length).to.equal(1);
      expect(logs[0].temperatureCelsius).to.equal(200);
      expect(logs[0].recorder).to.equal(tester.address);
    });

    it("reverts for unauthorized caller (no logistics or tester role)", async function () {
      const { pharma, outsider, LOGISTICS_ROLE } =
        await loadFixture(inTransitFixture);
      await expect(
        pharma.connect(outsider).recordTemperature(1, 365)
      )
        .to.be.revertedWithCustomError(pharma, "RecipientMissingRole")
        .withArgs(outsider.address, LOGISTICS_ROLE);
    });

    it("emits TemperatureRecorded with correct parameters", async function () {
      const { pharma, logistics } = await loadFixture(inTransitFixture);

      await expect(pharma.connect(logistics).recordTemperature(1, 365))
        .to.emit(pharma, "TemperatureRecorded")
        .withArgs(1, 365, logistics.address, () => true);
    });

    it("records multiple temperature readings", async function () {
      const { pharma, logistics } = await loadFixture(inTransitFixture);

      await pharma.connect(logistics).recordTemperature(1, 350);
      await pharma.connect(logistics).recordTemperature(1, 360);
      await pharma.connect(logistics).recordTemperature(1, 370);

      const logs = await pharma.getTemperatureLogs(1);
      expect(logs.length).to.equal(3);
      expect(logs[0].temperatureCelsius).to.equal(350);
      expect(logs[1].temperatureCelsius).to.equal(360);
      expect(logs[2].temperatureCelsius).to.equal(370);
    });

    it("records negative temperatures (cold storage)", async function () {
      const { pharma, logistics } = await loadFixture(inTransitFixture);
      await pharma.connect(logistics).recordTemperature(1, -200);

      const logs = await pharma.getTemperatureLogs(1);
      expect(logs[0].temperatureCelsius).to.equal(-200);
    });

    it("records extreme int16 boundaries", async function () {
      const { pharma, logistics } = await loadFixture(inTransitFixture);
      // int16 range: -32768 to 32767
      await pharma.connect(logistics).recordTemperature(1, -32768);
      await pharma.connect(logistics).recordTemperature(1, 32767);

      const logs = await pharma.getTemperatureLogs(1);
      expect(logs[0].temperatureCelsius).to.equal(-32768);
      expect(logs[1].temperatureCelsius).to.equal(32767);
    });

    it("records on any existing batch regardless of status", async function () {
      // Temperature can be logged even on a terminal batch (contract has no status check)
      const { pharma, tester } = await loadFixture(approvedFixture);
      await pharma.connect(tester).recordTemperature(1, 250);

      const logs = await pharma.getTemperatureLogs(1);
      expect(logs.length).to.equal(1);
    });

    it("reverts on non-existent batch", async function () {
      const { pharma, logistics } = await loadFixture(deployFixture);
      await expect(
        pharma.connect(logistics).recordTemperature(999, 365)
      )
        .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
        .withArgs(999);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  View / Query Functions
  // ═══════════════════════════════════════════════════════════════════════

  describe("View Functions", function () {
    describe("getBatch", function () {
      it("returns accurate data for a created batch", async function () {
        const { pharma, manufacturer } = await loadFixture(createdFixture);
        const batch = await pharma.getBatch(1);

        expect(batch.batchId).to.equal(1);
        expect(batch.drugName).to.equal("Aspirin");
        expect(batch.manufacturer).to.equal(manufacturer.address);
        expect(batch.currentHolder).to.equal(manufacturer.address);
        expect(batch.status).to.equal(Status.Created);
        expect(batch.createdAt).to.be.gt(0);
        expect(batch.updatedAt).to.equal(batch.createdAt);
      });

      it("reflects state changes after transitions", async function () {
        const { pharma, logistics } = await loadFixture(inTransitFixture);
        const batch = await pharma.getBatch(1);

        expect(batch.status).to.equal(Status.InTransit);
        expect(batch.currentHolder).to.equal(logistics.address);
        expect(batch.updatedAt).to.be.gte(batch.createdAt);
      });

      it("reverts for batchId 0", async function () {
        const { pharma } = await loadFixture(createdFixture);
        await expect(pharma.getBatch(0))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(0);
      });

      it("reverts for batchId beyond count", async function () {
        const { pharma } = await loadFixture(createdFixture);
        await expect(pharma.getBatch(2))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(2);
      });

      it("reverts for very large batchId when no batches exist", async function () {
        const { pharma } = await loadFixture(deployFixture);
        await expect(pharma.getBatch(999))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });
    });

    describe("getTemperatureLogs", function () {
      it("returns empty array for batch with no logs", async function () {
        const { pharma } = await loadFixture(createdFixture);
        const logs = await pharma.getTemperatureLogs(1);
        expect(logs.length).to.equal(0);
      });

      it("returns all logs in order", async function () {
        const { pharma, logistics } = await loadFixture(inTransitFixture);
        await pharma.connect(logistics).recordTemperature(1, 100);
        await pharma.connect(logistics).recordTemperature(1, 200);

        const logs = await pharma.getTemperatureLogs(1);
        expect(logs.length).to.equal(2);
        expect(logs[0].temperatureCelsius).to.equal(100);
        expect(logs[1].temperatureCelsius).to.equal(200);
        expect(logs[1].timestamp).to.be.gte(logs[0].timestamp);
      });

      it("reverts for batchId 0", async function () {
        const { pharma } = await loadFixture(createdFixture);
        await expect(pharma.getTemperatureLogs(0))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(0);
      });

      it("reverts for non-existent batch", async function () {
        const { pharma } = await loadFixture(deployFixture);
        await expect(pharma.getTemperatureLogs(5))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(5);
      });
    });

    describe("batchCount", function () {
      it("returns 0 with no batches", async function () {
        const { pharma } = await loadFixture(deployFixture);
        expect(await pharma.batchCount()).to.equal(0);
      });

      it("increments with each new batch", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);

        await pharma.connect(manufacturer).createBatch("A");
        expect(await pharma.batchCount()).to.equal(1);

        await pharma.connect(manufacturer).createBatch("B");
        expect(await pharma.batchCount()).to.equal(2);
      });

      it("does not decrease after state transitions", async function () {
        const { pharma } = await loadFixture(approvedFixture);
        expect(await pharma.batchCount()).to.equal(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  Edge Cases
  // ═══════════════════════════════════════════════════════════════════════

  describe("Edge Cases", function () {
    describe("batchExists modifier boundary conditions", function () {
      it("batchId = 0 always reverts (even with batches)", async function () {
        const { pharma } = await loadFixture(createdFixture);
        await expect(pharma.getBatch(0))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(0);
      });

      it("batchId = batchCount is valid", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        await pharma.connect(manufacturer).createBatch("Drug");
        // batchCount = 1, batchId = 1 → valid
        const batch = await pharma.getBatch(1);
        expect(batch.batchId).to.equal(1);
      });

      it("batchId = batchCount + 1 reverts", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        await pharma.connect(manufacturer).createBatch("Drug");
        // batchCount = 1, batchId = 2 → invalid
        await expect(pharma.getBatch(2))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(2);
      });
    });

    describe("Zero address handling", function () {
      it("shipBatch to zero address reverts (no LOGISTICS_ROLE)", async function () {
        const { pharma, manufacturer, LOGISTICS_ROLE } =
          await loadFixture(createdFixture);
        await expect(
          pharma
            .connect(manufacturer)
            .shipBatch(1, ethers.ZeroAddress)
        )
          .to.be.revertedWithCustomError(pharma, "RecipientMissingRole")
          .withArgs(ethers.ZeroAddress, LOGISTICS_ROLE);
      });

      it("deliverBatch to zero address succeeds (no role check on destination)", async function () {
        const { pharma, logistics } = await loadFixture(inTransitFixture);
        await pharma
          .connect(logistics)
          .deliverBatch(1, ethers.ZeroAddress);

        expect((await pharma.getBatch(1)).currentHolder).to.equal(
          ethers.ZeroAddress
        );
      });
    });

    describe("String edge cases", function () {
      it("allows single-character drug name", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        await pharma.connect(manufacturer).createBatch("A");
        expect((await pharma.getBatch(1)).drugName).to.equal("A");
      });

      it("allows very long drug name", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        const longName = "X".repeat(1000);
        await pharma.connect(manufacturer).createBatch(longName);
        expect((await pharma.getBatch(1)).drugName).to.equal(longName);
      });

      it("allows drug names with special characters", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        const special = "Aspirin® 500mg (acetylsalicylic acid) — batch #1";
        await pharma.connect(manufacturer).createBatch(special);
        expect((await pharma.getBatch(1)).drugName).to.equal(special);
      });

      it("allows unicode drug names", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        const unicode = "\u30A2\u30B9\u30D4\u30EA\u30F3"; // Aspirin in Japanese
        await pharma.connect(manufacturer).createBatch(unicode);
        expect((await pharma.getBatch(1)).drugName).to.equal(unicode);
      });
    });

    describe("Multi-batch independence", function () {
      it("state transitions on one batch do not affect another", async function () {
        const { pharma, manufacturer, logistics, regulator } =
          await loadFixture(deployFixture);

        await pharma.connect(manufacturer).createBatch("Drug A");
        await pharma.connect(manufacturer).createBatch("Drug B");

        // Advance batch 1 to InTransit
        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);

        // Recall batch 2
        await pharma.connect(regulator).recallBatch(2);

        // Verify independence
        expect((await pharma.getBatch(1)).status).to.equal(Status.InTransit);
        expect((await pharma.getBatch(2)).status).to.equal(Status.Recalled);
      });

      it("temperature logs are isolated per batch", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(deployFixture);

        await pharma.connect(manufacturer).createBatch("Drug A");
        await pharma.connect(manufacturer).createBatch("Drug B");

        await pharma
          .connect(manufacturer)
          .shipBatch(1, logistics.address);
        await pharma
          .connect(manufacturer)
          .shipBatch(2, logistics.address);

        await pharma.connect(logistics).recordTemperature(1, 100);
        await pharma.connect(logistics).recordTemperature(1, 200);
        await pharma.connect(logistics).recordTemperature(2, 999);

        expect((await pharma.getTemperatureLogs(1)).length).to.equal(2);
        expect((await pharma.getTemperatureLogs(2)).length).to.equal(1);
        expect(
          (await pharma.getTemperatureLogs(2))[0].temperatureCelsius
        ).to.equal(999);
      });
    });

    describe("Modifier ordering", function () {
      it("role check fires before batchExists on shipBatch", async function () {
        const { pharma, outsider, MANUFACTURER_ROLE } =
          await loadFixture(deployFixture);
        // batchId 999 doesn't exist, but role check should fire first
        await expect(
          pharma.connect(outsider).shipBatch(999, outsider.address)
        )
          .to.be.revertedWithCustomError(
            pharma,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(outsider.address, MANUFACTURER_ROLE);
      });

      it("batchExists fires before onlyHolder on shipBatch", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(createdFixture);
        // batch 999 doesn't exist; manufacturer has the role
        await expect(
          pharma.connect(manufacturer).shipBatch(999, logistics.address)
        )
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });
    });

    describe("Recall idempotency", function () {
      it("cannot recall a batch twice", async function () {
        const { pharma, regulator } = await loadFixture(recalledFixture);
        await expect(pharma.connect(regulator).recallBatch(1))
          .to.be.revertedWithCustomError(pharma, "TerminalState")
          .withArgs(1, Status.Recalled);
      });
    });

    describe("Approve vs Reject mutual exclusivity", function () {
      it("cannot approve after rejection", async function () {
        const { pharma, tester } = await loadFixture(rejectedFixture);
        // tester is holder, but status is terminal
        await expect(pharma.connect(tester).approveBatch(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Rejected, Status.Approved);
      });

      it("cannot reject after approval", async function () {
        const { pharma, tester } = await loadFixture(approvedFixture);
        await expect(pharma.connect(tester).rejectBatch(1))
          .to.be.revertedWithCustomError(pharma, "InvalidStateTransition")
          .withArgs(Status.Approved, Status.Rejected);
      });
    });

    describe("batchExists reverts on every state-changing function", function () {
      it("deliverBatch reverts for non-existent batch", async function () {
        const { pharma, logistics, extra } =
          await loadFixture(deployFixture);
        await expect(
          pharma.connect(logistics).deliverBatch(999, extra.address)
        )
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });

      it("beginQATesting reverts for non-existent batch", async function () {
        const { pharma, tester } = await loadFixture(deployFixture);
        await expect(pharma.connect(tester).beginQATesting(999))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });

      it("approveBatch reverts for non-existent batch", async function () {
        const { pharma, tester } = await loadFixture(deployFixture);
        await expect(pharma.connect(tester).approveBatch(999))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });

      it("rejectBatch reverts for non-existent batch", async function () {
        const { pharma, tester } = await loadFixture(deployFixture);
        await expect(pharma.connect(tester).rejectBatch(999))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });

      it("recallBatch reverts for non-existent batch", async function () {
        const { pharma, regulator } = await loadFixture(deployFixture);
        await expect(pharma.connect(regulator).recallBatch(999))
          .to.be.revertedWithCustomError(pharma, "BatchDoesNotExist")
          .withArgs(999);
      });
    });

    describe("ReentrancyGuard (nonReentrant)", function () {
      // Storage layout: slot 0 = AccessControl._roles, slot 1 = ReentrancyGuard._status
      // NOT_ENTERED = 1, ENTERED = 2
      const REENTRANCY_SLOT =
        "0x0000000000000000000000000000000000000000000000000000000000000001";
      const ENTERED_VALUE =
        "0x0000000000000000000000000000000000000000000000000000000000000002";

      async function setReentrancyEntered(pharma: PharmaChain) {
        const addr = await pharma.getAddress();
        await ethers.provider.send("hardhat_setStorageAt", [
          addr,
          REENTRANCY_SLOT,
          ENTERED_VALUE,
        ]);
      }

      it("createBatch reverts when guard is entered", async function () {
        const { pharma, manufacturer } = await loadFixture(deployFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(manufacturer).createBatch("Drug")
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("shipBatch reverts when guard is entered", async function () {
        const { pharma, manufacturer, logistics } =
          await loadFixture(createdFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(manufacturer).shipBatch(1, logistics.address)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("deliverBatch reverts when guard is entered", async function () {
        const { pharma, logistics, extra } =
          await loadFixture(inTransitFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(logistics).deliverBatch(1, extra.address)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("beginQATesting reverts when guard is entered", async function () {
        const { pharma, tester } = await loadFixture(deliveredFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(tester).beginQATesting(1)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("approveBatch reverts when guard is entered", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(tester).approveBatch(1)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("rejectBatch reverts when guard is entered", async function () {
        const { pharma, tester } = await loadFixture(qaTestingFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(tester).rejectBatch(1)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("recallBatch reverts when guard is entered", async function () {
        const { pharma, regulator } = await loadFixture(createdFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(regulator).recallBatch(1)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });

      it("recordTemperature reverts when guard is entered", async function () {
        const { pharma, logistics } = await loadFixture(inTransitFixture);
        await setReentrancyEntered(pharma);

        await expect(
          pharma.connect(logistics).recordTemperature(1, 365)
        ).to.be.revertedWithCustomError(
          pharma,
          "ReentrancyGuardReentrantCall"
        );
      });
    });
  });
});
