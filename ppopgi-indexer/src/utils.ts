import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { RaffleEvent, RaffleEventType, Raffle } from "../generated/schema"

export function eventId(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32())
}

export function touchRaffle(raffle: Raffle, event: ethereum.Event): void {
  raffle.lastUpdatedBlock = event.block.number
  raffle.lastUpdatedTimestamp = event.block.timestamp
}

export function createRaffleEvent(
  raffleId: Bytes,
  t: RaffleEventType,
  event: ethereum.Event
): RaffleEvent {
  let e = new RaffleEvent(eventId(event))
  e.raffle = raffleId
  e.type = t
  e.blockNumber = event.block.number
  e.blockTimestamp = event.block.timestamp
  e.txHash = event.transaction.hash
  e.logIndex = BigInt.fromI32(event.logIndex.toI32())
  return e
}