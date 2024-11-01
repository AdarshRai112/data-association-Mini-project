const express = require('express');
const app=express();
const path=require('path');
const userModel=require("./models/user");
const postModel=require("./models/post");
const cookieParser=require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt=require('jsonwebtoken');

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(express.static(path.join(__dirname,'public')));
app.set("view engine","ejs");
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.render('index');
});
app.get("/login",(req,res)=>{
    res.render('login');
});
app.get("/logout",(req,res)=>{
    res.cookie("token","");
    res.redirect('/login');
});

app.post("/register",async (req,res)=>{
    let {email,name,username,password,age}=req.body;
    let user = await userModel.findOne({email});
    if(user){
        return res.status(400).send("User Already registered");
    }

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async(err,hash)=>{
            let createdUser=await userModel.create({
                name,
                username,
                email,
                password:hash,
                age
            });
            
            let token=jwt.sign({email:email,userid:createdUser._id},"sagaga");
            res.cookie("token",token);
            res.send("Registered");
        })
    })

});
app.get('/profile',isLoggedin,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email}).populate("posts");
    
    res.render('profile',{user});

    
})
app.post('/post',isLoggedin,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email});
    console.log(user);
    let post= await postModel.create({
        user:user._id,
        content:req.body.content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
    
})
app.get("/like/:id",isLoggedin,async(req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();
    res.redirect('/profile');

})
app.get("/edit/:id",isLoggedin,async(req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user");
    res.render('edit',{post})
})
app.post("/update/:id",isLoggedin,async(req,res)=>{
    let post=await postModel.findOneAndUpdate({_id:req.params.id},{
        content:req.body.content
    })
    res.redirect('/profile');
    
})
app.post("/Delete/:id",isLoggedin,async(req,res)=>{
    let post=await postModel.findOneAndDelete({_id:req.params.id})
    res.redirect('/profile');
    
})

app.post("/login",async (req,res)=>{
    let {email,password}=req.body;
    let user = await userModel.findOne({email});
    if(!user){
        return res.status(400).send("Something went wrong");
    }
    bcrypt.compare(req.body.password,user.password,(err,result)=>{
        if(!result){
            res.redirect("/login")
        }
        else{
            let token =jwt.sign({email:email,userid:user._id},"sagaga");
            res.cookie("token",token);
            res.redirect('/profile');
        }
    })
    

});

function isLoggedin(req,res,next){
    if(req.cookies.token==="") res.redirect('/login')
    else{
       let data = jwt.verify(req.cookies.token,"sagaga");
       req.user = data;
    }
    next();
}

app.listen(3000);
