#!/bin/bash
SBIN=`dirname $0`
SBIN="`cd "$SBIN"; pwd`"
. $SBIN/configure.sh
cd $DATA_DIR
$GETH_SPECULAR_DIR/build/bin/geth --datadir ./data_indexer attach http://0.0.0.0:4021
