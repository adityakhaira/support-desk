const bcrypt = require("bcryptjs");

const hash = "$2a$10$MA0KC9ITtpPdxcC4Aqla6se6gjhu3MciOXmbgAR/s.ZcH/7nx3SVR2";

bcrypt.compare("Customer@123", hash).then((matches) => {
  console.log("Password matches:", matches);
});