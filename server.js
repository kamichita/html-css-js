const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Discord Webhook URL from environment variables or config
// 本番環境ではこれを.envファイルから読み込むか、環境変数として設定します
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1349340153583370362/iGi7H9jdVBI56dHW432r6_w3ZTxa1ECP_4MBWhIvTxmKqO-BcKnoZ_Me7GvC75ms-NUV';

// ミドルウェア
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ルートページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// アクティブユーザーのリスト
const activeUsers = new Set();

// Socket.io接続処理
io.on('connection', (socket) => {
  console.log('ユーザーが接続しました');
  let username = '';

  // ユーザーが参加
  socket.on('user join', (name) => {
    username = name;
    activeUsers.add(username);
    
    // 全員にユーザーリストを更新
    io.emit('update users', Array.from(activeUsers));
    
    // 参加メッセージを送信
    io.emit('chat message', {
      username: 'システム',
      message: `${username} さんが参加しました`,
      timestamp: new Date().toISOString()
    });
  });

  // チャットメッセージ受信
  socket.on('chat message', (data) => {
    // メッセージを全員に送信
    io.emit('chat message', data);
  });

  // 切断時
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました');
    if (username) {
      activeUsers.delete(username);
      
      // 全員にユーザーリストを更新
      io.emit('update users', Array.from(activeUsers));
      
      // 退出メッセージを送信
      io.emit('chat message', {
        username: 'システム',
        message: `${username} さんが退出しました`,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// お問い合わせAPI
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // バリデーション
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: '必須項目が入力されていません' });
    }
    
    // Discordウェブフックに送信
    const webhookData = {
      embeds: [{
        title: `お問い合わせ: ${subject}`,
        color: getColorForSubject(subject),
        fields: [
          { name: '名前', value: name, inline: true },
          { name: 'メール', value: email, inline: true },
          { name: '件名', value: subject, inline: false },
          { name: 'メッセージ', value: message }
        ],
        footer: {
          text: `送信日時: ${new Date().toLocaleString('ja-JP')}`
        }
      }]
    };
    
    // 通報の場合はタグを追加
    if (subject === '通報') {
      webhookData.content = '@here 通報が届きました！';
    }
    
    await axios.post(DISCORD_WEBHOOK_URL, webhookData);
    
    res.status(200).json({ message: 'お問い合わせが送信されました' });
  } catch (error) {
    console.error('エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 件名に応じた色コードを取得
function getColorForSubject(subject) {
  switch(subject) {
    case '質問':
      return 3447003; // 青
    case '提案':
      return 2067276; // 緑
    case '通報':
      return 15158332; // 赤
    default:
      return 10181046; // グレー
  }
}

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
