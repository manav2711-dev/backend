const router = require("express").Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { celebrate } = require("celebrate")
const User = require("../models/User.model")
const Password = require("../models/Password.model")
const { auth: authSchema } = require("../models/schema")
const { v4: uuidv4 } = require("uuid");
const nodemailer =  require("nodemailer");
const { verifyGoogleToken, randomBytes, generateLoginHash, deriveAesKey, encryptPassword, decryptPassword } = require("../utils/utils")
const crypto = require("crypto");

router.post("/register", 
	celebrate({body: authSchema.register.unknown(true)}), 
	async (req, res) => {
	const {fullname, email, password } = req.body

	try {
		// const userId = `USR-${uuidv4().slice(0, 8).toUpperCase()}`;
		const passwordHash = await bcrypt.hash(password, 10)
		await User.create({
			fullname, 
			email, 
			password: passwordHash 
		})
		res.status(201).json(authResponse.userCreated)

	} catch (err) {
		console.error(err)
		res.status(500).json(authResponse.unexpectedError)
	}
});


router.post("/login", 
	celebrate({ body: authSchema.login }), 
	async (req, res) => {
	const { email, password } = req.body

	const user = await User.findOne({ email })
	if (!user) {
		return res.status(401).json(authResponse.loginFailed)
	}

	const isValidLogin = await bcrypt.compare(password, user.password)
	if (isValidLogin) {
		const jwtToken = jwt.sign(
			{
				uid: user._id,
				isAdmin: user.isAdmin,
			}, 
			process.env.JWT_SECRET,
			{expiresIn: "3d"},
		)

		return res.json({ 
			...authResponse.loginSuccess,
			accessToken: jwtToken,
		})
	} else {
		return res.status(401).json(authResponse.loginFailed)
	}
})

router.post("/forgot-password", 
	// celebrate({ body: authSchema.login }), 
	async (req, res) => {
	const { email } = req.body

	const user = await User.findOne({ email })
	if (!user) {
		return res.status(401).json(authResponse.loginFailed)
	}
		const token = jwt.sign(
			{
				uid: user._id,
			}, 
			process.env.JWT_RESET_SECRET,
			{expiresIn: "15m"},
		)

		const resetUrl = `http://localhost:3000/ForgotPassword?a=${encodeURIComponent(token)}`;

		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth:{ 
				user:process.env.EMAIL_USER,
			    pass:process.env.EMAIL_PASS,
			}
		});

		const mailOptions = {
			from:process.env.EMAIL_USER,
			to:email,
			subject:"Password Reset Request",
			html: `
			<p>You requested a password reset.</p>
			<p>Click the link below to reset your password:</p>
			<a href="${resetUrl}" target="_blank">${resetUrl}</a>
			<p>This link expires in 15 minutes.</p>
			`,
		};
		await transporter.sendMail(mailOptions);

		return res.json({ 
			...authResponse.tokenSuccess,
			// accessToken: token,
		})
})

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body
  console.log(req.body);
  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET)

    const hashed = await bcrypt.hash(password, 10)

    await User.findByIdAndUpdate(decoded.uid, { password: hashed })

    res.json({ success: true })
  } catch(err) {
    res.status(400).json({ error: "Invalid or expired token",err })
  }
})

router.post("/google", async (req, res) => {
	const {token} = req.body
	console.log("google token",token);
	try {
		const payload = await verifyGoogleToken(token);
		console.log("payload",payload);
        let user = await User.findOne({ email:payload.email });
		if (!user && payload.email_verified == true) {
		user = await User.create({
			fullname:payload.name, 
			email:payload.email, 
			password:"",
		});
		}
		return res.json({
			status:"ok",
			data:user,
			verified:payload.email_verified,
		})
	} catch (error) {
		return res.status(401).json(authResponse.loginFailed)
	}
})

router.post("/googlelogin", async (req, res) => {
	const { email,verified} = req.body
	console.log("google login",req.body);
	const user = await User.findOne({ email })
	if (!user) {
		return res.status(401).json(authResponse.loginFailed)
	}

	// const isValidLogin = await bcrypt.compare(password, user.password)
	if (verified) {
		const jwtToken = jwt.sign(
			{
				uid: user._id,
				isAdmin: user.isAdmin,
			}, 
			process.env.JWT_SECRET,
			{expiresIn: "3d"},
		)

		return res.json({ 
			...authResponse.loginSuccess,
			accessToken: jwtToken,
		})
	} else {
		return res.status(401).json(authResponse.loginFailed)
	}
})

router.post("/mob/register", 
	// celebrate({body: authSchema.register.unknown(true)}), 
	async (req, res) => {
	const {fullname, email, password,phone } = req.body

	try {
		const salt = randomBytes(16).toString("hex");
		const passwordHash = generateLoginHash(password,salt);
		await User.create({
			fullname, 
			email,
			phone, 
			password: passwordHash, 
			salt:salt
		})
		res.status(201).json(authResponse.userCreated)

	} catch (err) {
		console.error(err)
		res.status(500).json(authResponse.unexpectedError)
	}
});

router.post("/mob/login", 
	// celebrate({ body: authSchema.login }), 
	async (req, res) => {
	const { email, password } = req.body

	const user = await User.findOne({ email })
	if (!user) {
		return res.status(401).json(authResponse.loginFailed)
	}

	console.log("user",user)

	const derivedLoginHash = generateLoginHash(password,user.salt);

	const storedHashBuffer = Buffer.from(user.password, "hex");
    const derivedHashBuffer = Buffer.from(derivedLoginHash, "hex");

		// Timing‑safe comparison
	const isValidLogin = crypto.timingSafeEqual(storedHashBuffer,derivedHashBuffer);
	if (isValidLogin) {
		const jwtToken = jwt.sign(
			{
				uid: user._id,
				isAdmin: user.isAdmin,
			}, 
			process.env.JWT_SECRET,
			{expiresIn: "3d"},
		)

		const aesKey = deriveAesKey(
			password,
			user.salt
		)

		req.session.aesKey = aesKey;
		req.session.userId = user._id.toString();

		return res.json({ 
			...authResponse.loginSuccess,
			accessToken: jwtToken,
			user:{
				id:user._id,
				name:user.fullname,
				email:user.email,
				phone:user.phone,
			}
		})
	} else {
		return res.status(401).json(authResponse.loginFailed)
	}
})


router.post("/mob/encrypt", 
	// celebrate({ body: authSchema.login }), 
	async (req, res) => {

	if (!req.session || !req.session.aesKey) {
         return res.status(401).json({
         message: "Session expired. Please login again."
     });
     }

     let aesKey = req.session.aesKey;

	//  console.log(aesKey)

	if (aesKey && aesKey.type === "Buffer") {
	aesKey = Buffer.from(aesKey.data);
   }

    if (!Buffer.isBuffer(aesKey) || aesKey.length !== 32) {
    return res.status(500).json({
      message: "Invalid AES key in session"
    });
    }

	const { passData, userId } = req.body
	console.log("req.body",req.body);
    const user = await User.findById({ _id:userId })
	// console.log("pass user",user);

		try {
		// const aesKey = deriveAesKey(masterPassword,user.salt);
		const encrypted = encryptPassword(passData.password,aesKey)
		await Password.create({
			userId:user._id,
			username:passData.username,
			name:passData.name, 
			description:passData.description,
			iv:encrypted.iv, 
			ciphertext: encrypted.ciphertext, 
			authTag:encrypted.authTag,
		})
		console.log(authResponse.passCreated);
		res.status(201).json(authResponse.passCreated)

	} catch (err) {
		console.error(err)
		res.status(500).json(authResponse.unexpectedError)
	}
})

router.post("/mob/decrypt", 
	// celebrate({ body: authSchema.login }), 
	async (req, res) => {

	if (!req.session || !req.session.aesKey) {
         return res.status(401).json({
         message: "Session expired. Please login again."
     });
     }

     let aesKey = req.session.aesKey;

	 if (aesKey && aesKey.type === "Buffer") {
      aesKey = Buffer.from(aesKey.data);
     }

    if (!Buffer.isBuffer(aesKey) || aesKey.length !== 32) {
    return res.status(500).json({
      message: "Invalid AES key in session"
    });
    }

	const { passId } = req.body
	console.log("body",req.body)
    // const user = await User.findById(userId)
	// console.log("user",user)

	const passData = await Password.findOne({_id:passId});
	console.log("PassData",passData)

		try {
		// const aesKey = deriveAesKey(masterPassword,user.salt);
		const decrypted = decryptPassword(passData,aesKey)
		res.status(200).json(decrypted)

	} catch (err) {
		console.error(err)
		res.status(500).json(authResponse.unexpectedError)
	}
})



router.post("/mob/getPasswords", 
	// celebrate({ body: authSchema.login }), 
	async (req, res) => {
	const { userId} = req.body
	console.log("userID",req.body);
    // const user = await User.findById(userId)
	// console.log("user",user)
		try {
			const passData = await Password.find({userId});
	        console.log("PassData",passData)
		    res.status(201).json(passData)
	} catch (err) {
		console.error(err)
		res.status(500).json(authResponse.unexpectedError)
	}
})

const authResponse = {
	userCreated: { 
		status: "ok",
		message: "user created",
	},
	loginSuccess: {
		status: "ok",
		message: "login successful",
	},
	loginFailed: {
		status: "error",
		message: "incorrect email or password",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
	tokenSuccess: {
		status: "ok",
		message: "Reset email link sent",
	},
	passCreated: { 
		status: "ok",
		message: "encypted password created",
	},
}

module.exports = router