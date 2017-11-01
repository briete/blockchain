
"use strict";

const crypto = require("crypto");
const express = require("express");
const bodyParser = require('body-parser');
const app = express();

//ブロックチェーン
class BlockChain {
	constructor() {
		this.chain = new Array();
		this.currentTransactions = new Array();

		// ジェネシスブロック
		this.newBlock(100, "1");
	}

	/**
     * ブロックチェーンに新しいブロックを作る
     * @param {int} proof プルーフ・オブ・ワークアルゴリズムから得られるプルーフ
     * @param {string} previousHash 前のブロックのハッシュ
     * @return {dictionary} 新しいブロック
     */
	newBlock(proof, previousHash) {
		let block = {
			index: this.chain.length + 1,
			timestamp: Date.now(),
			transactions: this.currentTransactions,
			proof: proof,
			previousHash: previousHash || BlockChain.hash(this.chain[this.chain.length - 1])
		};

		this.currentTransactions = new Array();
		this.chain.push(block);
		return block;
	}

    /**
     * 次に採掘されるブロックに加える新しいトランザクションを作る
     * @param {string} sender 送信者のアドレス
     * @param {string} recipient 受信者のアドレス
     * @param {int} amount 量
     * @return {string}
     */
	newTransaction(sender, recipient, amount) {
		this.currentTransactions.push({
			sender: sender,
			recipient: recipient,
			amount: amount
		});

		return this.lastBlock.index + 1;
	}

    /**
     * シンプルなプルーフオブワークのあアルゴリズム
     * hash(pp')の最初の４つが０となるようなP'を探す
     * pは前のプルーフ　p'は新しいプルーフ
     * @param {int} lastProof 前のプルーフ 
     * @return {int}
     */
	proofOfWork(lastProof) {
		let proof = 0;
		while (BlockChain.validProof(lastProof, proof) === false)　 {
			proof++;
		}

		return proof
	}

	// チェーンの最後のブロックを取得する
	get lastBlock() {
		return this.chain[this.chain.length - 1];
	}

　　　/**
     * ブロックの　SHA-256　ハッシュを作る
     * @param {dictionary} block 送信者のアドレス
     * @return {string}
     */
	static hash(block) {
		let _hash = crypto.createHash('sha256');
		block = JSON.stringify(block);
		_hash.update(block);
		return _hash.digest('base64');
	}

	/**
     * プルーフが正しいかを確認する:hash(lastProof, proof)の最初の４つが０となっているか？
     * @param {int} lastProof 前のプルーフ 
     * @param {int} proof 現在のプルーフ 
     * @return {bool} 正しければtrue、そうでなければfalse
     */
	static validProof(lastProof, proof) {
		let guess = `${lastProof}${proof}`
		let hash = crypto.createHash('sha256');
		hash.update(guess);
		let guessHash = hash.digest('base64');
		
		return guessHash.indexOf('0000') === 0;
	}
	
	static generateUuid() {
	    // https://github.com/GoogleChrome/chrome-platform-analytics/blob/master/src/internal/identifier.js
	    // const FORMAT: string = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
	    let chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("");
	    for (let i = 0, len = chars.length; i < len; i++) {
	        switch (chars[i]) {
	            case "x":
	                chars[i] = Math.floor(Math.random() * 16).toString(16);
	                break;
	            case "y":
	                chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
	                break;
	        }
	    }
	    return chars.join("");
	}
}

//ブロックチェーンクラスのインスタンスを作成
var blockchain = new BlockChain();

//このノードのユニークなアドレスを作成
var uuid = BlockChain.generateUuid().replace('-','');

// Node.js Expressフレームワーク
var server = app.listen(5000);

console.log('UUID:' + uuid);
console.log("server is online");

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
    let block = blockchain.newBlock(proof, null);

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

