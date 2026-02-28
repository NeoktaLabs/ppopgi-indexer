import {
  LotteryRegistered as LotteryRegisteredEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RegistrarSet as RegistrarSetEvent
} from "../generated/LotteryRegistry/LotteryRegistry"
import {
  LotteryRegistered,
  OwnershipTransferred,
  RegistrarSet
} from "../generated/schema"

export function handleLotteryRegistered(event: LotteryRegisteredEvent): void {
  let entity = new LotteryRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.index = event.params.index
  entity.typeId = event.params.typeId
  entity.lottery = event.params.lottery
  entity.creator = event.params.creator

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldOwner = event.params.oldOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRegistrarSet(event: RegistrarSetEvent): void {
  let entity = new RegistrarSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.registrar = event.params.registrar
  entity.authorized = event.params.authorized

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
