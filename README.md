Ppopgi Indexer is the **The Graph subgraph** powering data indexing and queryability for the Ppopgi raffle protocol on **Etherlink**.

The indexer listens to on-chain events emitted by the factory, registry and raffle contracts to build a structured, queryable dataset used by the frontend and analytics tools. It tracks lottery lifecycle events, ticket purchases, participant data, randomness requests, winner selection and cancellation flows.

The subgraph enables:
- Real-time lottery discovery and filtering
- Efficient pagination of raffles and participants
- Activity feeds and timeline reconstruction
- Frontend state hydration without direct RPC scanning

All indexed data is derived deterministically from contract events, meaning the indexer is **non-custodial and trust-minimized**. The protocol remains fully functional without it, but the indexer significantly improves performance, UX and data accessibility.