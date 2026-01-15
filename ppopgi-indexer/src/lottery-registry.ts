import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  LotteryRegistered as LotteryRegisteredEvent,
  RegistrarSet as RegistrarSetEvent,
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/LotteryRegistry/LotteryRegistry"

import {
  Raffle,
  Registrar,
  RegistryOwner,
  RaffleEventType,
  RaffleStatus
} from "../generated/schema"

import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates"

import { createRaffleEvent, touchRaffle } from "./utils"

export function handleLotteryRegistered(event: LotteryRegisteredEvent): void {
  let raffleId = event.params.lottery

  let raffle = Raffle.load(raffleId)
  let isNew = false

  if (raffle == null) {
    // Fallback: create raffle discovered via registry (in case deployer indexing started later).
    raffle = new Raffle(raffleId)
    isNew = true

    raffle.creator = event.params.creator
    raffle.name = "Unnamed"
    raffle.createdAtBlock = event.block.number
    raffle.createdAtTimestamp = event.block.timestamp
    raffle.creationTx = event.transaction.hash

    raffle.usdc = Address.zero()
    raffle.entropy = Address.zero()
    raffle.entropyProvider = Address.zero()
    raffle.feeRecipient = Address.zero()
    raffle.protocolFeePercent = BigInt.zero()
    raffle.winningPot = BigInt.zero()
    raffle.ticketPrice = BigInt.zero()
    raffle.deadline = BigInt.zero()
    raffle.minTickets = BigInt.zero()
    raffle.maxTickets = BigInt.zero()

    // ✅ Fix: avoid numeric enum assignment
    raffle.status = RaffleStatus.OPEN

    raffle.sold = BigInt.zero()
    raffle.ticketRevenue = BigInt.zero()
    raffle.isRegistered = true
    raffle.paused = false
  } else {
    // If the raffle already exists (e.g., created from deployer events),
    // just ensure it's marked registered + registry metadata updated below.
  }

  raffle.registry = event.address
  raffle.registryIndex = event.params.index
  raffle.typeId = event.params.typeId
  raffle.isRegistered = true
  raffle.registeredAt = event.block.timestamp

  touchRaffle(raffle, event)
  raffle.save()

  // ✅ Fix: ensure we start indexing this lottery even if it was discovered via the registry.
  // This prevents "registered but never indexed" raffles when deployer events were missed.
  if (isNew) {
    LotterySingleWinnerTemplate.create(raffleId)
  } else {
    // Optional: you can still create unconditionally; The Graph will typically dedupe template creation.
    // LotterySingleWinnerTemplate.create(raffleId)
  }

  let ev = createRaffleEvent(raffleId, RaffleEventType.LOTTERY_REGISTERED, event)
  ev.actor = event.params.creator
  ev.uintValue = event.params.typeId
  ev.save()
}

export function handleRegistrarSet(event: RegistrarSetEvent): void {
  let id = event.params.registrar as Address

  let r = Registrar.load(id)
  if (r == null) {
    r = new Registrar(id)
  }

  r.registry = event.address
  r.authorized = event.params.authorized
  r.updatedAtBlock = event.block.number
  r.updatedAtTimestamp = event.block.timestamp
  r.updatedTx = event.transaction.hash
  r.save()
}

export function handleRegistryOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let id = event.address as Address

  let o = RegistryOwner.load(id)
  if (o == null) {
    o = new RegistryOwner(id)
  }

  o.owner = event.params.newOwner
  o.updatedAtBlock = event.block.number
  o.updatedAtTimestamp = event.block.timestamp
  o.updatedTx = event.transaction.hash
  o.save()
}