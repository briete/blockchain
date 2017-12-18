
"use strict";

const crypto = require("crypto");
const axios = require('axios');

// ブロックチェーン
class BlockChain {
	constructor() {
		this.chain = new Array();
		this.currentTransactions = new Array();
		this.nodes = new Set();

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
   * シンプルなプルーフオブワークアルゴリズム
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

		return proof;
	}

	/**
   * ノードリストに新しいノードを加える
   * @param {string} address ノードのアドレス 例: 'http://192.168.0.5:5000'
   */
	registerNode(address) {
		let parsedUrl = url.parse(address);
		this.nodes.add(parsedUrl.host);
	}

	/**
   * ブロックチェーンが正しいかを確認する
   * @param {string} chain ブロックチェーン
   * @return {boolean} 正しければtrue、正しくなければfalse
   */
	validChain(chain) {
		let lastBlock = chain[0];
		let currentIndex = 0;
		while(currentIndex < chain.length) {
			let block = chain[currentIndex];
			console.log(`${lastBlock}`);
			console.log(`${block}`);
			console.log('\n--------------\n');

			// ブロックのハッシュが正しいかの確認
			if (block.previousHash != this.hash(lastBlock)) {
				return false;
			}

			// プルーフ・オフ・ワークが正しいかの確認
			if (!BlockChain.validProof(lastBlock.proof, block.proof)) {
				return false;
			}

			lastBlock = block;
			currentIndex++;
		}

		return true;
	}

	/**
   * コンセンサスアルゴリズム。ネットワーク上の最も長いチェーンで自らのチェーンを置き換えることで
   * コンフリクトを解決する。
   * @return 自らのチェーンが置き換わるとtrue、そうでなければfalse
   */
	resolveConflicts() {
		let neighbours = this.nodes;
		let newChain = null;

		// 自らのチェーンより長いチェーンを探す必要がある
		let maxLength = this.chain.length;

		// 他のすべてのノードのチェーンを確認
		for(let node of neighbours)  {
			axios.get(`http://${node}/chain`).then(({ data }) => {
				const response = data;

				if(response.status === 200)  {
					let length = response.data.length;
					let chain = response.data.chain;

					// そのチェーンがより長いか、有効化を確認
					if(length > maxLength && this.validChain()) {
						maxLength = length;
						newChain = chain;
					}
				}　else {
					console.log("status:" + response.status);
				}
			});
		}

		// もし自らのチェーンより長く、かつ有効なチェーンを見つけた場合それで置き換える
		if (newChain !== null) {
			this.chain = newChain;
			return true;
		} else {
			return false;
		}
	}
	
	/**
   * ブロックの　SHA-256　ハッシュを作る
   * @param {dictionary} block 送信者のアドレス
   * @return {string}
   */
	static hash(block) {
		let sha = crypto.createHash('sha256');
		block = JSON.stringify(block);
		sha.update(block);
		return sha.digest('base64');
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
		console.log(guessHash)
		return guessHash.indexOf('000') === 0;
	}

	/**
   * UUIDをジェネレートする
   * @return {string} UUID
   */
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

	/**
   * チェーンの最後のブロックを取得する
   * @return {object} 最後のブロック
   */
	get lastBlock() {
		return this.chain[this.chain.length - 1];
	}
}

module.exports = BlockChain;
