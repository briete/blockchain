const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const url = require('url');
const BlockChain = require('./blockchain');

// ブロックチェーンクラスのインスタンスを作成
const blockchain = new BlockChain();

// このノードのユニークなアドレスを作成
const uuid = BlockChain.generateUuid();

// サーバーリッスン
const server = app.listen(5000);

console.log('UUID:' + uuid);
console.log("Express server is online");

// urlencodedとjsonは別々に初期化する
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 新しいトランザクションの作成
app.post("/transactions/new", function(req, res){
	let values = req.body;
	let required = ['sender', 'recipient', 'amount'];

　　　 // POSTされたデータに必要なデータがあるか確認
	for (let i = 0; i < required.length; i++)  {
		if (!required[i] in values) {
			res.status(401).send('Missing values');
  			return;
		}
	}

	// 新しいトランザクションを作る
	let index = blockchain.newTransaction(values.sender, values.recipient, values.amount);
	let response = { message: `トランザクションはブロック${index}に追加されました`};
	res.status(201);
	res.json(response);
	return;
});

// 採掘(マイニング)
app.get("/mine", function(req, res){
	// 次のプルーフを見つけるため、プルーフオブワークアルゴリズムを用いる
	let lastBlock = blockchain.lastBlock;
	let lastProof = lastBlock.proof;
	let proof = blockchain.proofOfWork(lastProof);

	// プルーフを見つけたことに対する報酬
	// 送信者は、採掘者が新しいコインを採掘したことを表すため、"0"とする
	blockchain.newTransaction(0, uuid, 1);

	// チェーンに新しいブロックを加えることで、新しいブロックを採掘する
	let block = blockchain.newBlock(proof, lastBlock.previousHash);

	const response = {
		message: '新しいブロックを採掘しました',
		index: block.index,
		transactions: block.transactions,
		proof: block.proof,
		previousHash: block.previousHash
	}

	res.status(200);
	res.json(response);
	return;
});

//　ブロックチェーンをリターンする
app.get("/chain", function(req, res){
	let response = {
		'chain': blockchain.chain,
		'length': blockchain.chain.length
	};

	res.status(200);
	res.json(response);
	return;
});

// ノードを追加する
app.post("/nodes/register", function(req, res){
	let values = req.body;
	let nodes = values.nodes;

	if(nodes === null || nodes === undefined)  {
		res.status(400);
		return "error: 有効ではないノードのリストです";
	}

	for(let node of nodes) {
		blockchain.registerNode(node);
	}

	let response = {
		message: '新しいノードが追加されました',
		total_nodes: [...blockchain.nodes]
	};

	res.status(201);
	return res.json(response);
});

// コンセンサス
app.get("/nodes/resolve", function(req, res){
	let replaced = blockchain.resolveConflicts();
	res.status(200);

	if (replaced) {
		let response = {
			message: 'チェーンが置き換えられました',
			new_chain: blockchain.chain
		};
		return res.json(response);
	} else {
		let response = {
			message: 'チェーンが確認されました',
			chain: blockchain.chain
		};
		return res.json(response);
	}
});
