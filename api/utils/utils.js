const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function getGender(id) {
       switch (id) {
            case 1:
                return "Men";
            case 2:
                return "Women";
            case 3:
                return "Unisex";
            default:
                return "";
        }
}

function getOccasion(id) {
    switch(id){
          case 1:
                return "Office";
            case 2:
                return "Special Occasions";
            case 3:
                return "Casuals";
            default:
                return "";
        }
}

const tokengeneration = (itemId,qty,price) => {
      // const unixDate = new Date(date).getTime();
     const token = itemId+(qty)*150+(price)*100;
    //  console.log(unixDate);
     return token;
    };

async function verifyGoogleToken(token) {
    const ticket = await client.verifyIdToken({
        idToken:token,
        audience:process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
}


function randomBytes(size) {
  return crypto.randomBytes(size);
}

function generateLoginHash (password,salt){
return crypto.pbkdf2Sync(
    password,
    salt+ "login",
    100000,
    32,
    "sha256"
).toString("hex")
}

function deriveAesKey(masterPassword,salt){
return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    100000,
    32,
    "sha256"
);
}
    
function encryptPassword(plainPassword,aesKey){
    const iv = randomBytes(12);
     const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        aesKey,
        iv,
     );

     const encrypted = Buffer.concat([
        cipher.update(plainPassword,"utf-8"),
        cipher.final()
     ]);

     const authTag = cipher.getAuthTag();

     return {
        iv: iv.toString("hex"),
        ciphertext:encrypted.toString("hex"),
        authTag: authTag.toString("hex")
     }
}

function decryptPassword(encryptedData,aesKey){
     const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        aesKey,
        Buffer.from(encryptedData.iv,"hex"),
     );

     decipher.setAuthTag(Buffer.from(encryptedData.authTag,"hex"))

     const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData.ciphertext,"hex")),
        decipher.final()
     ]);

     return decrypted.toString("utf8")
}



module.exports = { 
    getGender, 
    getOccasion,
    tokengeneration,
    verifyGoogleToken,
    randomBytes,
    generateLoginHash,
    deriveAesKey,
    encryptPassword, 
    decryptPassword,
};