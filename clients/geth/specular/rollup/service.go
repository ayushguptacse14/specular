package rollup

import (
	"bytes"
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts"
	bind "github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/log"
	"github.com/ethereum/go-ethereum/node"
	"github.com/specularl2/specular/clients/geth/specular/proof"
	"github.com/specularl2/specular/clients/geth/specular/rollup/client"
	"github.com/specularl2/specular/clients/geth/specular/rollup/services"
	"github.com/specularl2/specular/clients/geth/specular/rollup/services/indexer"
	"github.com/specularl2/specular/clients/geth/specular/rollup/services/sequencer"
	"github.com/specularl2/specular/clients/geth/specular/rollup/services/validator"
	"github.com/specularl2/specular/clients/geth/specular/rollup/utils/fmt"
)

// RegisterRollupService registers rollup service configured by ctx
// Either a sequncer service or a validator service will be registered
func RegisterRollupService(stack *node.Node, eth services.Backend, proofBackend proof.Backend, cfg *services.Config) {
	// Unlock account for L1 transaction signer
	var ks *keystore.KeyStore
	if keystores := stack.AccountManager().Backends(keystore.KeyStoreType); len(keystores) > 0 {
		ks = keystores[0].(*keystore.KeyStore)
	}
	if ks == nil {
		log.Crit("Failed to register the Rollup service: keystore not found")
	}
	chainID := big.NewInt(int64(cfg.L1ChainID))
	json, err := ks.Export(accounts.Account{Address: cfg.Coinbase}, cfg.Passphrase, "")
	if err != nil {
		log.Crit("Failed to register the Rollup service", "err", err)
	}
	auth, err := bind.NewTransactorWithChainID(bytes.NewReader(json), cfg.Passphrase, chainID)
	if err != nil {
		log.Crit("Failed to register the Rollup service", "err", err)
	}

	// Register services
	ctx := context.Background()
	l1Client, err := client.NewEthBridgeClient(ctx, cfg.L1Endpoint, cfg.L1RollupGenesisBlock, cfg.SequencerInboxAddr, cfg.RollupAddr, auth)
	var service node.Lifecycle
	switch cfg.Node {
	case services.NODE_SEQUENCER:
		service, err = sequencer.New(eth, proofBackend, l1Client, cfg)
	case services.NODE_VALIDATOR:
		service, err = validator.New(eth, proofBackend, l1Client, cfg)
	case services.NODE_INDEXER:
		service, err = indexer.New(eth, proofBackend, l1Client, cfg)
	default:
		err = fmt.Errorf("Node type unkown: %v", cfg.Node)
	}
	if err != nil {
		log.Crit("Failed to register rollup service", "err", err)
	}
	stack.RegisterLifecycle(service)
}
