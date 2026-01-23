// src/lottery-registry.ts

import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  LotteryRegistered as LotteryRegisteredEvent,
  RegistrarSet as RegistrarSetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../generated/LotteryRegistry/LotteryRegistry";

import { Raffle, Registrar, RegistryOwner } from "../generated/schema";
import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates";
import { createRaffleEvent, touchRaffle } from "./utils";

const TYPE_SINGLE_WINNER = BigInt.fromI32(1);

function ensureRaffleDefaults(raffle: Raffle): void {
  // These are required in your schema; keep this defensive in case older entities exist.
  if (raffle.usdc == null) raffle.usdc = Address.zero();
  if (raffle.entropy == null) raffle.entropy = Address.zero();
  if (raffle.entropyProvider == null) raffle.entropyProvider = Address.zero();
  if (raffle.feeRecipient == null) raffle.feeRecipient = Address.zero();
  if (raffle.protocolFeePercent == null) raffle.protocolFeePercent = BigInt.zero();

  if (raffle.callbackGasLimit == null) raffle.callbackGasLimit = BigInt.zero();
  if (raffle.minPurchaseAmount == null) raffle.minPurchaseAmount = BigInt.zero();

  if (raffle.winningPot == null) raffle.winningPot = BigInt.zero();
  if (raffle.ticketPrice == null) raffle.ticketPrice = BigInt.zero();
  if (raffle.deadline == null) raffle.deadline = BigInt.zero();
  if (raffle.minTickets == null) raffle.minTickets = BigInt.zero();
  if (raffle.maxTickets == null) raffle.maxTickets = BigInt.zero();

  if (raffle.status == null) raffle.status = "FUNDING_PENDING";
  if (raffle.sold == null) raffle.sold = BigInt.zero();
  if (raffle.ticketRevenue == null) raffle.ticketRevenue = BigInt.zero();
  if (raffle.paused == null) raffle.paused = false;

  if (raffle.isRegistered == null) raffle.isRegistered = false;

  // createdAt* / creator / name are required too; but if a raffle exists at all,
  // they should already be set. We don’t overwrite them here.
}

export function handleLotteryRegistered(event: LotteryRegisteredEvent): void {
  const raffleId = event.params.lottery;

  let raffle = Raffle.load(raffleId);
  const wasMissing = raffle == null;
  const wasRegistered = raffle != null ? raffle.isRegistered : false;

  if (raffle == null) {
    // Fallback: raffle discovered via registry (if deployer indexing started later).
    raffle = new Raffle(raffleId);

    // NOTE: these are "discovered at" values until deployer backfills real creation metadata
    raffle.creator = event.params.creator;
    raffle.name = "Unnamed";
    raffle.createdAtBlock = event.block.number;
    raffle.createdAtTimestamp = event.block.timestamp;
    raffle.creationTx = event.transaction.hash;

    // initialize required fields (stub)
    ensureRaffleDefaults(raffle);
  } else {
    // Ensure required fields exist even for already-created raffles (migration safety)
    ensureRaffleDefaults(raffle);
  }

  // Always update registry-related metadata
  raffle.registry = event.address;
  raffle.registryIndex = event.params.index;
  raffle.typeId = event.params.typeId;
  raffle.isRegistered = true;
  raffle.registeredAt = event.block.timestamp;

  touchRaffle(raffle, event);
  raffle.save();

  // Create template only for known typeId=1 (single-winner)
  // Creating duplicates is usually fine, but we keep your guard.
  if (event.params.typeId.equals(TYPE_SINGLE_WINNER) && (wasMissing || !wasRegistered)) {
    LotterySingleWinnerTemplate.create(raffleId);
  }

  const ev = createRaffleEvent(raffleId, "LOTTERY_REGISTERED", event);
  ev.actor = event.params.creator;
  ev.uintValue = event.params.typeId;
  ev.save();
}

export function handleRegistrarSet(event: RegistrarSetEvent): void {
  const id = event.params.registrar as Address;

  let r = Registrar.load(id);
  if (r == null) r = new Registrar(id);

  r.registry = event.address;
  r.authorized = event.params.authorized;
  r.updatedAtBlock = event.block.number;
  r.updatedAtTimestamp = event.block.timestamp;
  r.updatedTx = event.transaction.hash;
  r.save();
}

export function handleRegistryOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  const id = event.address as Address;

  let o = RegistryOwner.load(id);
  if (o == null) o = new RegistryOwner(id);

  o.owner = event.params.newOwner;
  o.updatedAtBlock = event.block.number;
  o.updatedAtTimestamp = event.block.timestamp;
  o.updatedTx = event.transaction.hash;
  o.save();
}