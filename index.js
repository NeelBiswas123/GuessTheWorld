import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import dotenv from "dotenv";
dotenv.config()

const app = express();
const port = 3000;

//this is for local
// const db = new pg.Client({
//   user: "postgres",
//   host: "localhost",
//   database: "world",
//   password: "123456",
//   port: 5432,
// });


// this is for render deployment
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,  // ✅ Use Render's database URL
  ssl: {
    rejectUnauthorized: false, // ✅ Required for Render PostgreSQL
  },
});


db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));





app.get("/", async(req,res)=>{
  let countries = []
  const result = await db.query("SELECT country_name FROM correct_countries");
  // console.log("rr",result.rows)
  countries = (result.rows.map(country=>country.country_name))
  // console.log("ss",countries)

  // console.log(countries)
  res.render("index.ejs",{countries:countries, total:countries.length})
  // db.end()
})


//this is for  login /signuup option
app.get("/register",async(req,res)=>{
  // res.send("this is under construction")
  res.render("register.ejs")
})




app.use(session({
  secret: "TOPSECRETWORD",
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);


//this is get methos of google auth
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/register",
  }),
  (req, res) => {
    // Redirect with a query parameter
    res.redirect("/?login=success");
  }
);




app.post("/add", async (req, res) => {
  try {
    const input = req.body["country"];

    if (!input || input.length < 3) {
        const visitedResult = await db.query("SELECT country_name FROM correct_countries");
        
        return res.render("index.ejs", {
            countries: visitedResult.rows.map(row => row.country_name),
            total: visitedResult.rows.length,  // Score based on correct_countries count
            error: "Please enter a country name.",
        });
        
    }
    
    
    // Check if country exists in the database
    const result = await db.query(
      "SELECT country_name FROM country_list WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );



    
    if (result.rows.length === 0) {
      const visitedResult = await db.query("SELECT country_name FROM correct_countries");


    res.render("result.ejs", {
        // countries: visitedResult.rows.map(row => row.country_code),
        total: visitedResult.rows.length , 
        error:null
      });
      
      
      //  Reset the database after showing the result
      await db.query("DELETE FROM correct_countries");
      await db.query("ALTER SEQUENCE correct_countries_id_seq RESTART WITH 1");

      // res.redirect("/")
    
    return
    }

    const countryName = result.rows[0].country_name;

    // Check if the country is already in visited country
    const checkVisited = await db.query(
      "SELECT * FROM correct_countries WHERE country_name= $1",
      [countryName]
    );

    if (checkVisited.rows.length > 0) {
      const visitedResult = await db.query("SELECT country_name FROM correct_countries");

      return res.render("index.ejs", {
        countries: visitedResult.rows.map(row => row.country_name),
        total: visitedResult.rows.length,  // Update total score
        error: "This country is already in visited countries.",
      });
    }

    // Insert into correct_countries db
    await db.query(
      "INSERT INTO correct_countries(country_name) VALUES ($1) ",
      [countryName]
    );

    // Fetch updated visited countries list & score updated
    const updatedVisited = await db.query("SELECT country_name FROM correct_countries");

    res.render("index.ejs", {
      countries: updatedVisited.rows.map(row => row.country_name),
      total: updatedVisited.rows.length,  // Score now updates correctly
      error: null,
    });

  } catch (error) {
    console.error("Error:", error);

    const visitedResult = await db.query("SELECT country_name FROM correct_countries");

    res.render("index.ejs", {
      countries: visitedResult.rows.map(row => row.country_name),
      total: visitedResult.rows.length,  // Ensure score is consistent
      error: "Something went wrong. Please try again.",
    });
  }
});










// this portion is for DB
//this is for local register method

app.post("/register", async (req, res) => {

  const email = req.body.username
  const password = req.body.password
  // res.render("register.ejs")
  if (email>0){
    try{
    const checkResult = await db.query( "SELECT * FROM users_db where email = $1 ",[email]);
    // console.log("JJ",checkResult)

    if(checkResult.rows.length > 0 ){
      res.send("Email already exist !! go to login")
      res.render("index.ejs")
    }else{

      const result = 
      await db.query("insert into users_db (email,password) values ($1,$2)", [email,password]);
      
      console.log("ok ! data added to db")
      // res.send("Account created !!!!")
      // res.redirect("/register")
      }



    }catch(err){
      console.log("error is", err)
    }
  }  
  else{
    res.send(`
      <script>
        alert("Username or password should not be empty");
        window.location.href="/";
      
      </script> `);
  }
  });
  




  //this is for google authentication

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE username = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);


passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  // callbackURL: process.env.NODE_ENV === "production" 
  // ? "https://https://guesstheworld.onrender.com/auth/google/secrets"
  // : "http://localhost:3000/auth/google/secrets",
  
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const result = await db.query("SELECT * FROM users_db WHERE email = $1", [profile.email]);
    if (result.rows.length === 0) {
      const newUser = await db.query("INSERT INTO users_db(email, password) VALUES ($1, $2) RETURNING *", [profile.email, "google"]);
      console.log("New user created");
      

      return cb(null, newUser.rows[0]);
    } else {
      console.log("User logged in");
      return cb(null, result.rows[0]);
    }
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});






app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
