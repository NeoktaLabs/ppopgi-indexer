import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  LotteryRegistered as LotteryRegisteredEvent,
  RegistrarSet as RegistrarSetEvent,
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/LotteryRegistry/LotteryRegistry"

import { Raffle, Registrar, RegistryOwner } from "../generated/schema"
import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates"
import { createRaffleEvent, touchRaffle } from "./utils"

const TYPE_SINGLE_WINNER = BigInt.fromI32(1)

export function handleLotteryRegistered(event: LotteryRegisteredEvent): void {
  let raffleId = event.params.lottery
  let raffle = Raffle.load(raffleId)

  if (raffle == null) {
    // Fallback: raffle discovered via registry (if deployer indexing started later).
    raffle = new Raffle(raffleId)

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

    // ✅ V2 required fields
    raffle.callbackGasLimit = BigInt.zero()
    raffle.minPurchaseAmount = BigInt.zero()

    raffle.winningPot = BigInt.zero()
    raffle.ticketPrice = BigInt.zero()
    raffle.deadline = BigInt.zero()
    raffle.minTickets = BigInt.zero()
    raffle.maxTickets = BigInt.zero()

    // Safer default: we don't actually know funding status yet.
    raffle.status = "FUNDING_PENDING"

    raffle.sold = BigInt.zero()
    raffle.ticketRevenue = BigInt.zero()
    raffle.paused = false

    raffle.isRegistered = false
  }

  // Always update registry-related metadata
  raffle.registry = event.address
  raffle.registryIndex = event.params.index
  raffle.typeId = event.params.typeId
  raffle.isRegistered = true
  raffle.registeredAt = event.block.timestamp

  touchRaffle(raffle, event)
  raffle.save()

  // ✅ Create template only for known typeId=1 (single-winner)
  if (event.params.typeId.equals(TYPE_SINGLE_WINNER)) {
    LotterySingleWinnerTemplate.create(raffleId)
  }

  let ev = createRaffleEvent(raffleId, "LOTTERY_REGISTERED", event)
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