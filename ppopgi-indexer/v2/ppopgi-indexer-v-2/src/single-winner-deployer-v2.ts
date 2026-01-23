// src/single-winner-deployer-v2.ts

import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  ConfigUpdated as ConfigUpdatedEvent,
  DeployerOwnershipTransferred as DeployerOwnershipTransferredEvent,
  LotteryDeployed as LotteryDeployedEvent,
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployerV2";

import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates";
import { FactoryConfig, DeployerOwner, Raffle } from "../generated/schema";
import { createRaffleEvent, touchRaffle } from "./utils";

// Contract binding (template ABI) to fetch minPurchaseAmount (not in deployer event)
import { LotterySingleWinnerV2 as LotterySingleWinnerV2Contract } from "../generated/templates/LotterySingleWinner/LotterySingleWinnerV2";

export function handleConfigUpdated(event: ConfigUpdatedEvent): void {
  const id = event.address as Address;

  let cfg = FactoryConfig.load(id);
  if (cfg == null) cfg = new FactoryConfig(id);

  cfg.usdc = event.params.usdc;
  cfg.entropy = event.params.entropy;
  cfg.provider = event.params.provider;
  cfg.callbackGasLimit = event.params.callbackGasLimit;
  cfg.feeRecipient = event.params.feeRecipient;
  cfg.protocolFeePercent = event.params.protocolFeePercent;

  cfg.updatedAtBlock = event.block.number;
  cfg.updatedAtTimestamp = event.block.timestamp;
  cfg.updatedTx = event.transaction.hash;

  cfg.save();
}

export function handleDeployerOwnershipTransferred(
  event: DeployerOwnershipTransferredEvent
): void {
  const id = event.address as Address;

  let d = DeployerOwner.load(id);
  if (d == null) d = new DeployerOwner(id);

  d.owner = event.params.newOwner;
  d.updatedAtBlock = event.block.number;
  d.updatedAtTimestamp = event.block.timestamp;
  d.updatedTx = event.transaction.hash;

  d.save();
}

export function handleLotteryDeployed(event: LotteryDeployedEvent): void {
  const raffleId = event.params.lottery;

  let raffle = Raffle.load(raffleId);
  const isNew = raffle == null;

  if (raffle == null) {
    raffle = new Raffle(raffleId);

    // lifecycle defaults (required fields)
    raffle.isRegistered = false;
    raffle.paused = false;
    raffle.status = "FUNDING_PENDING";
    raffle.sold = BigInt.zero();
    raffle.ticketRevenue = BigInt.zero();

    raffle.winner = null;
    raffle.winningTicketIndex = null;
    raffle.finalizeRequestId = null;
    raffle.finalizedAt = null;
    raffle.selectedProvider = null;
    raffle.completedAt = null;
    raffle.canceledReason = null;
    raffle.canceledAt = null;
    raffle.soldAtCancel = null;

    // (registry fallback might have created it first; but for brand new, set these now)
    raffle.registry = null;
    raffle.registryIndex = null;
    raffle.typeId = null;
    raffle.registeredAt = null;
  }

  // --- ALWAYS backfill from deployer event (this is the fix) ---
  raffle.deployer = event.address;

  // immutable creation metadata (if it was created via registry fallback, overwrite placeholders)
  raffle.creator = event.params.creator;
  raffle.name = event.params.name;

  // createdAt* should reflect the deploy tx if we missed it before
  // (safe to overwrite if registry fallback created it using a later block)
  raffle.createdAtBlock = event.block.number;
  raffle.createdAtTimestamp = event.block.timestamp;
  raffle.creationTx = event.transaction.hash;

  raffle.usdc = event.params.usdc;
  raffle.entropy = event.params.entropy;
  raffle.entropyProvider = event.params.entropyProvider;
  raffle.feeRecipient = event.params.feeRecipient;
  raffle.protocolFeePercent = event.params.protocolFeePercent;

  // emitted in deployer event
  raffle.callbackGasLimit = event.params.callbackGasLimit;

  // ✅ IMPORTANT: these were missing in your else branch
  raffle.winningPot = event.params.winningPot;
  raffle.ticketPrice = event.params.ticketPrice;
  raffle.deadline = event.params.deadline;
  raffle.minTickets = event.params.minTickets;
  raffle.maxTickets = event.params.maxTickets;

  // minPurchaseAmount is not in deployer event; fetch from contract if we don't have it yet
  if (raffle.minPurchaseAmount == null || raffle.minPurchaseAmount.equals(BigInt.zero())) {
    const lot = LotterySingleWinnerV2Contract.bind(raffleId);
    const minTry = lot.try_minPurchaseAmount();
    raffle.minPurchaseAmount = minTry.reverted ? BigInt.zero() : minTry.value;
  }

  touchRaffle(raffle, event);
  raffle.save();

  // Create template to index this lottery instance
  // (creating twice is fine; The Graph ignores duplicates)
  LotterySingleWinnerTemplate.create(raffleId);

  // audit event
  const ev = createRaffleEvent(raffleId, "LOTTERY_DEPLOYED", event);
  ev.actor = event.params.creator;
  ev.save();
}