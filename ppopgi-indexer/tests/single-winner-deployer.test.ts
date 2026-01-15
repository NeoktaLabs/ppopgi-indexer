import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ConfigUpdated } from "../generated/schema"
import { ConfigUpdated as ConfigUpdatedEvent } from "../generated/SingleWinnerDeployer/SingleWinnerDeployer"
import { handleConfigUpdated } from "../src/single-winner-deployer"
import { createConfigUpdatedEvent } from "./single-winner-deployer-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let usdc = Address.fromString("0x0000000000000000000000000000000000000001")
    let entropy = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let provider = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let feeRecipient = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let protocolFeePercent = BigInt.fromI32(234)
    let newConfigUpdatedEvent = createConfigUpdatedEvent(
      usdc,
      entropy,
      provider,
      feeRecipient,
      protocolFeePercent
    )
    handleConfigUpdated(newConfigUpdatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("ConfigUpdated created and stored", () => {
    assert.entityCount("ConfigUpdated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ConfigUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "usdc",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ConfigUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "entropy",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ConfigUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "provider",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ConfigUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "feeRecipient",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ConfigUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "protocolFeePercent",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
