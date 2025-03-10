import express from "express";
import bodyParser from "body-parser";
import pg from "pg"

const app = express();
const port = 3000;


const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456",
  port: 5432,
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
  res.send("this is under construction")
  // res.render("register.ejs")
})



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

    // Insert into projectcountry
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










app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});