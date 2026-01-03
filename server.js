const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const SECRET = 'PHORNPISARN_SECRET';
const PORT = process.env.PORT || 3000;

// ===== Upload =====
const upload = multer({ dest: 'uploads/' });

// ===== Database =====
const db = new sqlite3.Database('./db.sqlite');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY,
    type TEXT,
    name TEXT,
    amount REAL,
    image TEXT,
    date TEXT
  )`);
});

// ===== Seed Users =====
(async()=>{
  const users = [
    ['JOY2','08314025547788'],
    ['Yanisa','06602070517788'],
    ['Pisarn','08333855287788'],
    ['Ouee1','0838926475']
  ];
  for(const [u,p] of users){
    const h = await bcrypt.hash(p,10);
    db.run(`INSERT OR IGNORE INTO users VALUES(null,?,?)`,[u,h]);
  }
})();

// ===== Login =====
app.post('/login',(req,res)=>{
  const {username,password}=req.body;
  db.get(`SELECT * FROM users WHERE username=?`,[username],async(_,u)=>{
    if(!u) return res.sendStatus(401);
    if(await bcrypt.compare(password,u.password)){
      res.json({token:jwt.sign({username},SECRET)});
    } else res.sendStatus(401);
  });
});

// ===== Auth =====
const auth=(req,res,next)=>{
  try{
    jwt.verify(req.headers.authorization,SECRET);
    next();
  }catch{ res.sendStatus(401); }
};

// ===== Add Bill / Income / Expense =====
app.post('/add',auth,upload.single('image'),(req,res)=>{
  const {type,name,amount}=req.body;
  const img = req.file ? req.file.path : null;
  db.run(
    `INSERT INTO bills VALUES(null,?,?,?,?,date('now'))`,
    [type,name,amount,img],
    ()=>res.json({success:true})
  );
});

// ===== List =====
app.get('/list',auth,(req,res)=>{
  db.all(`SELECT * FROM bills ORDER BY id DESC`,[],(_,r)=>res.json(r));
});

// ===== Summary =====
app.get('/summary',auth,(req,res)=>{
  db.all(`
    SELECT
    SUM(CASE WHEN type='income' THEN amount ELSE 0 END) income,
    SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) expense
    FROM bills
  `,[],(_,r)=>res.json(r[0]));
});

app.listen(PORT,()=>console.log('Backend running'));
