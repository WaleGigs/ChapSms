const axios = require("axios");
const https = require("https");

const PROVIDER_NAME = "benotp";

const BENOTP_FALLBACK_COUNTRIES = Object.freeze(
[
  {
    "id": "AF",
    "code": "AF",
    "iso2": "AF",
    "eng": "Afghanistan",
    "name": "Afghanistan",
    "flag": "🇦🇫"
  },
  {
    "id": "AL",
    "code": "AL",
    "iso2": "AL",
    "eng": "Albania",
    "name": "Albania",
    "flag": "🇦🇱"
  },
  {
    "id": "DZ",
    "code": "DZ",
    "iso2": "DZ",
    "eng": "Algeria",
    "name": "Algeria",
    "flag": "🇩🇿"
  },
  {
    "id": "AS",
    "code": "AS",
    "iso2": "AS",
    "eng": "American Samoa",
    "name": "American Samoa",
    "flag": "🇦🇸"
  },
  {
    "id": "AD",
    "code": "AD",
    "iso2": "AD",
    "eng": "Andorra",
    "name": "Andorra",
    "flag": "🇦🇩"
  },
  {
    "id": "AO",
    "code": "AO",
    "iso2": "AO",
    "eng": "Angola",
    "name": "Angola",
    "flag": "🇦🇴"
  },
  {
    "id": "AI",
    "code": "AI",
    "iso2": "AI",
    "eng": "Anguilla",
    "name": "Anguilla",
    "flag": "🇦🇮"
  },
  {
    "id": "AQ",
    "code": "AQ",
    "iso2": "AQ",
    "eng": "Antarctica",
    "name": "Antarctica",
    "flag": "🇦🇶"
  },
  {
    "id": "AG",
    "code": "AG",
    "iso2": "AG",
    "eng": "Antigua and Barbuda",
    "name": "Antigua and Barbuda",
    "flag": "🇦🇬"
  },
  {
    "id": "AR",
    "code": "AR",
    "iso2": "AR",
    "eng": "Argentina",
    "name": "Argentina",
    "flag": "🇦🇷"
  },
  {
    "id": "AM",
    "code": "AM",
    "iso2": "AM",
    "eng": "Armenia",
    "name": "Armenia",
    "flag": "🇦🇲"
  },
  {
    "id": "AW",
    "code": "AW",
    "iso2": "AW",
    "eng": "Aruba",
    "name": "Aruba",
    "flag": "🇦🇼"
  },
  {
    "id": "AU",
    "code": "AU",
    "iso2": "AU",
    "eng": "Australia",
    "name": "Australia",
    "flag": "🇦🇺"
  },
  {
    "id": "AT",
    "code": "AT",
    "iso2": "AT",
    "eng": "Austria",
    "name": "Austria",
    "flag": "🇦🇹"
  },
  {
    "id": "AZ",
    "code": "AZ",
    "iso2": "AZ",
    "eng": "Azerbaijan",
    "name": "Azerbaijan",
    "flag": "🇦🇿"
  },
  {
    "id": "BS",
    "code": "BS",
    "iso2": "BS",
    "eng": "Bahamas",
    "name": "Bahamas",
    "flag": "🇧🇸"
  },
  {
    "id": "BH",
    "code": "BH",
    "iso2": "BH",
    "eng": "Bahrain",
    "name": "Bahrain",
    "flag": "🇧🇭"
  },
  {
    "id": "BD",
    "code": "BD",
    "iso2": "BD",
    "eng": "Bangladesh",
    "name": "Bangladesh",
    "flag": "🇧🇩"
  },
  {
    "id": "BB",
    "code": "BB",
    "iso2": "BB",
    "eng": "Barbados",
    "name": "Barbados",
    "flag": "🇧🇧"
  },
  {
    "id": "BY",
    "code": "BY",
    "iso2": "BY",
    "eng": "Belarus",
    "name": "Belarus",
    "flag": "🇧🇾"
  },
  {
    "id": "BE",
    "code": "BE",
    "iso2": "BE",
    "eng": "Belgium",
    "name": "Belgium",
    "flag": "🇧🇪"
  },
  {
    "id": "BZ",
    "code": "BZ",
    "iso2": "BZ",
    "eng": "Belize",
    "name": "Belize",
    "flag": "🇧🇿"
  },
  {
    "id": "BJ",
    "code": "BJ",
    "iso2": "BJ",
    "eng": "Benin",
    "name": "Benin",
    "flag": "🇧🇯"
  },
  {
    "id": "BM",
    "code": "BM",
    "iso2": "BM",
    "eng": "Bermuda",
    "name": "Bermuda",
    "flag": "🇧🇲"
  },
  {
    "id": "BT",
    "code": "BT",
    "iso2": "BT",
    "eng": "Bhutan",
    "name": "Bhutan",
    "flag": "🇧🇹"
  },
  {
    "id": "BO",
    "code": "BO",
    "iso2": "BO",
    "eng": "Bolivia, Plurinational State of",
    "name": "Bolivia, Plurinational State of",
    "flag": "🇧🇴"
  },
  {
    "id": "BQ",
    "code": "BQ",
    "iso2": "BQ",
    "eng": "Bonaire, Sint Eustatius and Saba",
    "name": "Bonaire, Sint Eustatius and Saba",
    "flag": "🇧🇶"
  },
  {
    "id": "BA",
    "code": "BA",
    "iso2": "BA",
    "eng": "Bosnia and Herzegovina",
    "name": "Bosnia and Herzegovina",
    "flag": "🇧🇦"
  },
  {
    "id": "BW",
    "code": "BW",
    "iso2": "BW",
    "eng": "Botswana",
    "name": "Botswana",
    "flag": "🇧🇼"
  },
  {
    "id": "BV",
    "code": "BV",
    "iso2": "BV",
    "eng": "Bouvet Island",
    "name": "Bouvet Island",
    "flag": "🇧🇻"
  },
  {
    "id": "BR",
    "code": "BR",
    "iso2": "BR",
    "eng": "Brazil",
    "name": "Brazil",
    "flag": "🇧🇷"
  },
  {
    "id": "IO",
    "code": "IO",
    "iso2": "IO",
    "eng": "British Indian Ocean Territory",
    "name": "British Indian Ocean Territory",
    "flag": "🇮🇴"
  },
  {
    "id": "BN",
    "code": "BN",
    "iso2": "BN",
    "eng": "Brunei Darussalam",
    "name": "Brunei Darussalam",
    "flag": "🇧🇳"
  },
  {
    "id": "BG",
    "code": "BG",
    "iso2": "BG",
    "eng": "Bulgaria",
    "name": "Bulgaria",
    "flag": "🇧🇬"
  },
  {
    "id": "BF",
    "code": "BF",
    "iso2": "BF",
    "eng": "Burkina Faso",
    "name": "Burkina Faso",
    "flag": "🇧🇫"
  },
  {
    "id": "BI",
    "code": "BI",
    "iso2": "BI",
    "eng": "Burundi",
    "name": "Burundi",
    "flag": "🇧🇮"
  },
  {
    "id": "CV",
    "code": "CV",
    "iso2": "CV",
    "eng": "Cabo Verde",
    "name": "Cabo Verde",
    "flag": "🇨🇻"
  },
  {
    "id": "KH",
    "code": "KH",
    "iso2": "KH",
    "eng": "Cambodia",
    "name": "Cambodia",
    "flag": "🇰🇭"
  },
  {
    "id": "CM",
    "code": "CM",
    "iso2": "CM",
    "eng": "Cameroon",
    "name": "Cameroon",
    "flag": "🇨🇲"
  },
  {
    "id": "CA",
    "code": "CA",
    "iso2": "CA",
    "eng": "Canada",
    "name": "Canada",
    "flag": "🇨🇦"
  },
  {
    "id": "KY",
    "code": "KY",
    "iso2": "KY",
    "eng": "Cayman Islands",
    "name": "Cayman Islands",
    "flag": "🇰🇾"
  },
  {
    "id": "CF",
    "code": "CF",
    "iso2": "CF",
    "eng": "Central African Republic",
    "name": "Central African Republic",
    "flag": "🇨🇫"
  },
  {
    "id": "TD",
    "code": "TD",
    "iso2": "TD",
    "eng": "Chad",
    "name": "Chad",
    "flag": "🇹🇩"
  },
  {
    "id": "CL",
    "code": "CL",
    "iso2": "CL",
    "eng": "Chile",
    "name": "Chile",
    "flag": "🇨🇱"
  },
  {
    "id": "CN",
    "code": "CN",
    "iso2": "CN",
    "eng": "China",
    "name": "China",
    "flag": "🇨🇳"
  },
  {
    "id": "CX",
    "code": "CX",
    "iso2": "CX",
    "eng": "Christmas Island",
    "name": "Christmas Island",
    "flag": "🇨🇽"
  },
  {
    "id": "CC",
    "code": "CC",
    "iso2": "CC",
    "eng": "Cocos (Keeling) Islands",
    "name": "Cocos (Keeling) Islands",
    "flag": "🇨🇨"
  },
  {
    "id": "CO",
    "code": "CO",
    "iso2": "CO",
    "eng": "Colombia",
    "name": "Colombia",
    "flag": "🇨🇴"
  },
  {
    "id": "KM",
    "code": "KM",
    "iso2": "KM",
    "eng": "Comoros",
    "name": "Comoros",
    "flag": "🇰🇲"
  },
  {
    "id": "CG",
    "code": "CG",
    "iso2": "CG",
    "eng": "Congo",
    "name": "Congo",
    "flag": "🇨🇬"
  },
  {
    "id": "CD",
    "code": "CD",
    "iso2": "CD",
    "eng": "Congo, The Democratic Republic of the",
    "name": "Congo, The Democratic Republic of the",
    "flag": "🇨🇩"
  },
  {
    "id": "CK",
    "code": "CK",
    "iso2": "CK",
    "eng": "Cook Islands",
    "name": "Cook Islands",
    "flag": "🇨🇰"
  },
  {
    "id": "CR",
    "code": "CR",
    "iso2": "CR",
    "eng": "Costa Rica",
    "name": "Costa Rica",
    "flag": "🇨🇷"
  },
  {
    "id": "HR",
    "code": "HR",
    "iso2": "HR",
    "eng": "Croatia",
    "name": "Croatia",
    "flag": "🇭🇷"
  },
  {
    "id": "CU",
    "code": "CU",
    "iso2": "CU",
    "eng": "Cuba",
    "name": "Cuba",
    "flag": "🇨🇺"
  },
  {
    "id": "CW",
    "code": "CW",
    "iso2": "CW",
    "eng": "Curaçao",
    "name": "Curaçao",
    "flag": "🇨🇼"
  },
  {
    "id": "CY",
    "code": "CY",
    "iso2": "CY",
    "eng": "Cyprus",
    "name": "Cyprus",
    "flag": "🇨🇾"
  },
  {
    "id": "CZ",
    "code": "CZ",
    "iso2": "CZ",
    "eng": "Czechia",
    "name": "Czechia",
    "flag": "🇨🇿"
  },
  {
    "id": "CI",
    "code": "CI",
    "iso2": "CI",
    "eng": "Côte d'Ivoire",
    "name": "Côte d'Ivoire",
    "flag": "🇨🇮"
  },
  {
    "id": "DK",
    "code": "DK",
    "iso2": "DK",
    "eng": "Denmark",
    "name": "Denmark",
    "flag": "🇩🇰"
  },
  {
    "id": "DJ",
    "code": "DJ",
    "iso2": "DJ",
    "eng": "Djibouti",
    "name": "Djibouti",
    "flag": "🇩🇯"
  },
  {
    "id": "DM",
    "code": "DM",
    "iso2": "DM",
    "eng": "Dominica",
    "name": "Dominica",
    "flag": "🇩🇲"
  },
  {
    "id": "DO",
    "code": "DO",
    "iso2": "DO",
    "eng": "Dominican Republic",
    "name": "Dominican Republic",
    "flag": "🇩🇴"
  },
  {
    "id": "EC",
    "code": "EC",
    "iso2": "EC",
    "eng": "Ecuador",
    "name": "Ecuador",
    "flag": "🇪🇨"
  },
  {
    "id": "EG",
    "code": "EG",
    "iso2": "EG",
    "eng": "Egypt",
    "name": "Egypt",
    "flag": "🇪🇬"
  },
  {
    "id": "SV",
    "code": "SV",
    "iso2": "SV",
    "eng": "El Salvador",
    "name": "El Salvador",
    "flag": "🇸🇻"
  },
  {
    "id": "GQ",
    "code": "GQ",
    "iso2": "GQ",
    "eng": "Equatorial Guinea",
    "name": "Equatorial Guinea",
    "flag": "🇬🇶"
  },
  {
    "id": "ER",
    "code": "ER",
    "iso2": "ER",
    "eng": "Eritrea",
    "name": "Eritrea",
    "flag": "🇪🇷"
  },
  {
    "id": "EE",
    "code": "EE",
    "iso2": "EE",
    "eng": "Estonia",
    "name": "Estonia",
    "flag": "🇪🇪"
  },
  {
    "id": "SZ",
    "code": "SZ",
    "iso2": "SZ",
    "eng": "Eswatini",
    "name": "Eswatini",
    "flag": "🇸🇿"
  },
  {
    "id": "ET",
    "code": "ET",
    "iso2": "ET",
    "eng": "Ethiopia",
    "name": "Ethiopia",
    "flag": "🇪🇹"
  },
  {
    "id": "FK",
    "code": "FK",
    "iso2": "FK",
    "eng": "Falkland Islands (Malvinas)",
    "name": "Falkland Islands (Malvinas)",
    "flag": "🇫🇰"
  },
  {
    "id": "FO",
    "code": "FO",
    "iso2": "FO",
    "eng": "Faroe Islands",
    "name": "Faroe Islands",
    "flag": "🇫🇴"
  },
  {
    "id": "FJ",
    "code": "FJ",
    "iso2": "FJ",
    "eng": "Fiji",
    "name": "Fiji",
    "flag": "🇫🇯"
  },
  {
    "id": "FI",
    "code": "FI",
    "iso2": "FI",
    "eng": "Finland",
    "name": "Finland",
    "flag": "🇫🇮"
  },
  {
    "id": "FR",
    "code": "FR",
    "iso2": "FR",
    "eng": "France",
    "name": "France",
    "flag": "🇫🇷"
  },
  {
    "id": "GF",
    "code": "GF",
    "iso2": "GF",
    "eng": "French Guiana",
    "name": "French Guiana",
    "flag": "🇬🇫"
  },
  {
    "id": "PF",
    "code": "PF",
    "iso2": "PF",
    "eng": "French Polynesia",
    "name": "French Polynesia",
    "flag": "🇵🇫"
  },
  {
    "id": "TF",
    "code": "TF",
    "iso2": "TF",
    "eng": "French Southern Territories",
    "name": "French Southern Territories",
    "flag": "🇹🇫"
  },
  {
    "id": "GA",
    "code": "GA",
    "iso2": "GA",
    "eng": "Gabon",
    "name": "Gabon",
    "flag": "🇬🇦"
  },
  {
    "id": "GM",
    "code": "GM",
    "iso2": "GM",
    "eng": "Gambia",
    "name": "Gambia",
    "flag": "🇬🇲"
  },
  {
    "id": "GE",
    "code": "GE",
    "iso2": "GE",
    "eng": "Georgia",
    "name": "Georgia",
    "flag": "🇬🇪"
  },
  {
    "id": "DE",
    "code": "DE",
    "iso2": "DE",
    "eng": "Germany",
    "name": "Germany",
    "flag": "🇩🇪"
  },
  {
    "id": "GH",
    "code": "GH",
    "iso2": "GH",
    "eng": "Ghana",
    "name": "Ghana",
    "flag": "🇬🇭"
  },
  {
    "id": "GI",
    "code": "GI",
    "iso2": "GI",
    "eng": "Gibraltar",
    "name": "Gibraltar",
    "flag": "🇬🇮"
  },
  {
    "id": "GR",
    "code": "GR",
    "iso2": "GR",
    "eng": "Greece",
    "name": "Greece",
    "flag": "🇬🇷"
  },
  {
    "id": "GL",
    "code": "GL",
    "iso2": "GL",
    "eng": "Greenland",
    "name": "Greenland",
    "flag": "🇬🇱"
  },
  {
    "id": "GD",
    "code": "GD",
    "iso2": "GD",
    "eng": "Grenada",
    "name": "Grenada",
    "flag": "🇬🇩"
  },
  {
    "id": "GP",
    "code": "GP",
    "iso2": "GP",
    "eng": "Guadeloupe",
    "name": "Guadeloupe",
    "flag": "🇬🇵"
  },
  {
    "id": "GU",
    "code": "GU",
    "iso2": "GU",
    "eng": "Guam",
    "name": "Guam",
    "flag": "🇬🇺"
  },
  {
    "id": "GT",
    "code": "GT",
    "iso2": "GT",
    "eng": "Guatemala",
    "name": "Guatemala",
    "flag": "🇬🇹"
  },
  {
    "id": "GG",
    "code": "GG",
    "iso2": "GG",
    "eng": "Guernsey",
    "name": "Guernsey",
    "flag": "🇬🇬"
  },
  {
    "id": "GN",
    "code": "GN",
    "iso2": "GN",
    "eng": "Guinea",
    "name": "Guinea",
    "flag": "🇬🇳"
  },
  {
    "id": "GW",
    "code": "GW",
    "iso2": "GW",
    "eng": "Guinea-Bissau",
    "name": "Guinea-Bissau",
    "flag": "🇬🇼"
  },
  {
    "id": "GY",
    "code": "GY",
    "iso2": "GY",
    "eng": "Guyana",
    "name": "Guyana",
    "flag": "🇬🇾"
  },
  {
    "id": "HT",
    "code": "HT",
    "iso2": "HT",
    "eng": "Haiti",
    "name": "Haiti",
    "flag": "🇭🇹"
  },
  {
    "id": "HM",
    "code": "HM",
    "iso2": "HM",
    "eng": "Heard Island and McDonald Islands",
    "name": "Heard Island and McDonald Islands",
    "flag": "🇭🇲"
  },
  {
    "id": "VA",
    "code": "VA",
    "iso2": "VA",
    "eng": "Holy See (Vatican City State)",
    "name": "Holy See (Vatican City State)",
    "flag": "🇻🇦"
  },
  {
    "id": "HN",
    "code": "HN",
    "iso2": "HN",
    "eng": "Honduras",
    "name": "Honduras",
    "flag": "🇭🇳"
  },
  {
    "id": "HK",
    "code": "HK",
    "iso2": "HK",
    "eng": "Hong Kong",
    "name": "Hong Kong",
    "flag": "🇭🇰"
  },
  {
    "id": "HU",
    "code": "HU",
    "iso2": "HU",
    "eng": "Hungary",
    "name": "Hungary",
    "flag": "🇭🇺"
  },
  {
    "id": "IS",
    "code": "IS",
    "iso2": "IS",
    "eng": "Iceland",
    "name": "Iceland",
    "flag": "🇮🇸"
  },
  {
    "id": "IN",
    "code": "IN",
    "iso2": "IN",
    "eng": "India",
    "name": "India",
    "flag": "🇮🇳"
  },
  {
    "id": "ID",
    "code": "ID",
    "iso2": "ID",
    "eng": "Indonesia",
    "name": "Indonesia",
    "flag": "🇮🇩"
  },
  {
    "id": "IR",
    "code": "IR",
    "iso2": "IR",
    "eng": "Iran, Islamic Republic of",
    "name": "Iran, Islamic Republic of",
    "flag": "🇮🇷"
  },
  {
    "id": "IQ",
    "code": "IQ",
    "iso2": "IQ",
    "eng": "Iraq",
    "name": "Iraq",
    "flag": "🇮🇶"
  },
  {
    "id": "IE",
    "code": "IE",
    "iso2": "IE",
    "eng": "Ireland",
    "name": "Ireland",
    "flag": "🇮🇪"
  },
  {
    "id": "IM",
    "code": "IM",
    "iso2": "IM",
    "eng": "Isle of Man",
    "name": "Isle of Man",
    "flag": "🇮🇲"
  },
  {
    "id": "IL",
    "code": "IL",
    "iso2": "IL",
    "eng": "Israel",
    "name": "Israel",
    "flag": "🇮🇱"
  },
  {
    "id": "IT",
    "code": "IT",
    "iso2": "IT",
    "eng": "Italy",
    "name": "Italy",
    "flag": "🇮🇹"
  },
  {
    "id": "JM",
    "code": "JM",
    "iso2": "JM",
    "eng": "Jamaica",
    "name": "Jamaica",
    "flag": "🇯🇲"
  },
  {
    "id": "JP",
    "code": "JP",
    "iso2": "JP",
    "eng": "Japan",
    "name": "Japan",
    "flag": "🇯🇵"
  },
  {
    "id": "JE",
    "code": "JE",
    "iso2": "JE",
    "eng": "Jersey",
    "name": "Jersey",
    "flag": "🇯🇪"
  },
  {
    "id": "JO",
    "code": "JO",
    "iso2": "JO",
    "eng": "Jordan",
    "name": "Jordan",
    "flag": "🇯🇴"
  },
  {
    "id": "KZ",
    "code": "KZ",
    "iso2": "KZ",
    "eng": "Kazakhstan",
    "name": "Kazakhstan",
    "flag": "🇰🇿"
  },
  {
    "id": "KE",
    "code": "KE",
    "iso2": "KE",
    "eng": "Kenya",
    "name": "Kenya",
    "flag": "🇰🇪"
  },
  {
    "id": "KI",
    "code": "KI",
    "iso2": "KI",
    "eng": "Kiribati",
    "name": "Kiribati",
    "flag": "🇰🇮"
  },
  {
    "id": "KP",
    "code": "KP",
    "iso2": "KP",
    "eng": "Korea, Democratic People's Republic of",
    "name": "Korea, Democratic People's Republic of",
    "flag": "🇰🇵"
  },
  {
    "id": "KR",
    "code": "KR",
    "iso2": "KR",
    "eng": "Korea, Republic of",
    "name": "Korea, Republic of",
    "flag": "🇰🇷"
  },
  {
    "id": "KW",
    "code": "KW",
    "iso2": "KW",
    "eng": "Kuwait",
    "name": "Kuwait",
    "flag": "🇰🇼"
  },
  {
    "id": "KG",
    "code": "KG",
    "iso2": "KG",
    "eng": "Kyrgyzstan",
    "name": "Kyrgyzstan",
    "flag": "🇰🇬"
  },
  {
    "id": "LA",
    "code": "LA",
    "iso2": "LA",
    "eng": "Lao People's Democratic Republic",
    "name": "Lao People's Democratic Republic",
    "flag": "🇱🇦"
  },
  {
    "id": "LV",
    "code": "LV",
    "iso2": "LV",
    "eng": "Latvia",
    "name": "Latvia",
    "flag": "🇱🇻"
  },
  {
    "id": "LB",
    "code": "LB",
    "iso2": "LB",
    "eng": "Lebanon",
    "name": "Lebanon",
    "flag": "🇱🇧"
  },
  {
    "id": "LS",
    "code": "LS",
    "iso2": "LS",
    "eng": "Lesotho",
    "name": "Lesotho",
    "flag": "🇱🇸"
  },
  {
    "id": "LR",
    "code": "LR",
    "iso2": "LR",
    "eng": "Liberia",
    "name": "Liberia",
    "flag": "🇱🇷"
  },
  {
    "id": "LY",
    "code": "LY",
    "iso2": "LY",
    "eng": "Libya",
    "name": "Libya",
    "flag": "🇱🇾"
  },
  {
    "id": "LI",
    "code": "LI",
    "iso2": "LI",
    "eng": "Liechtenstein",
    "name": "Liechtenstein",
    "flag": "🇱🇮"
  },
  {
    "id": "LT",
    "code": "LT",
    "iso2": "LT",
    "eng": "Lithuania",
    "name": "Lithuania",
    "flag": "🇱🇹"
  },
  {
    "id": "LU",
    "code": "LU",
    "iso2": "LU",
    "eng": "Luxembourg",
    "name": "Luxembourg",
    "flag": "🇱🇺"
  },
  {
    "id": "MO",
    "code": "MO",
    "iso2": "MO",
    "eng": "Macao",
    "name": "Macao",
    "flag": "🇲🇴"
  },
  {
    "id": "MG",
    "code": "MG",
    "iso2": "MG",
    "eng": "Madagascar",
    "name": "Madagascar",
    "flag": "🇲🇬"
  },
  {
    "id": "MW",
    "code": "MW",
    "iso2": "MW",
    "eng": "Malawi",
    "name": "Malawi",
    "flag": "🇲🇼"
  },
  {
    "id": "MY",
    "code": "MY",
    "iso2": "MY",
    "eng": "Malaysia",
    "name": "Malaysia",
    "flag": "🇲🇾"
  },
  {
    "id": "MV",
    "code": "MV",
    "iso2": "MV",
    "eng": "Maldives",
    "name": "Maldives",
    "flag": "🇲🇻"
  },
  {
    "id": "ML",
    "code": "ML",
    "iso2": "ML",
    "eng": "Mali",
    "name": "Mali",
    "flag": "🇲🇱"
  },
  {
    "id": "MT",
    "code": "MT",
    "iso2": "MT",
    "eng": "Malta",
    "name": "Malta",
    "flag": "🇲🇹"
  },
  {
    "id": "MH",
    "code": "MH",
    "iso2": "MH",
    "eng": "Marshall Islands",
    "name": "Marshall Islands",
    "flag": "🇲🇭"
  },
  {
    "id": "MQ",
    "code": "MQ",
    "iso2": "MQ",
    "eng": "Martinique",
    "name": "Martinique",
    "flag": "🇲🇶"
  },
  {
    "id": "MR",
    "code": "MR",
    "iso2": "MR",
    "eng": "Mauritania",
    "name": "Mauritania",
    "flag": "🇲🇷"
  },
  {
    "id": "MU",
    "code": "MU",
    "iso2": "MU",
    "eng": "Mauritius",
    "name": "Mauritius",
    "flag": "🇲🇺"
  },
  {
    "id": "YT",
    "code": "YT",
    "iso2": "YT",
    "eng": "Mayotte",
    "name": "Mayotte",
    "flag": "🇾🇹"
  },
  {
    "id": "MX",
    "code": "MX",
    "iso2": "MX",
    "eng": "Mexico",
    "name": "Mexico",
    "flag": "🇲🇽"
  },
  {
    "id": "FM",
    "code": "FM",
    "iso2": "FM",
    "eng": "Micronesia, Federated States of",
    "name": "Micronesia, Federated States of",
    "flag": "🇫🇲"
  },
  {
    "id": "MD",
    "code": "MD",
    "iso2": "MD",
    "eng": "Moldova, Republic of",
    "name": "Moldova, Republic of",
    "flag": "🇲🇩"
  },
  {
    "id": "MC",
    "code": "MC",
    "iso2": "MC",
    "eng": "Monaco",
    "name": "Monaco",
    "flag": "🇲🇨"
  },
  {
    "id": "MN",
    "code": "MN",
    "iso2": "MN",
    "eng": "Mongolia",
    "name": "Mongolia",
    "flag": "🇲🇳"
  },
  {
    "id": "ME",
    "code": "ME",
    "iso2": "ME",
    "eng": "Montenegro",
    "name": "Montenegro",
    "flag": "🇲🇪"
  },
  {
    "id": "MS",
    "code": "MS",
    "iso2": "MS",
    "eng": "Montserrat",
    "name": "Montserrat",
    "flag": "🇲🇸"
  },
  {
    "id": "MA",
    "code": "MA",
    "iso2": "MA",
    "eng": "Morocco",
    "name": "Morocco",
    "flag": "🇲🇦"
  },
  {
    "id": "MZ",
    "code": "MZ",
    "iso2": "MZ",
    "eng": "Mozambique",
    "name": "Mozambique",
    "flag": "🇲🇿"
  },
  {
    "id": "MM",
    "code": "MM",
    "iso2": "MM",
    "eng": "Myanmar",
    "name": "Myanmar",
    "flag": "🇲🇲"
  },
  {
    "id": "NA",
    "code": "NA",
    "iso2": "NA",
    "eng": "Namibia",
    "name": "Namibia",
    "flag": "🇳🇦"
  },
  {
    "id": "NR",
    "code": "NR",
    "iso2": "NR",
    "eng": "Nauru",
    "name": "Nauru",
    "flag": "🇳🇷"
  },
  {
    "id": "NP",
    "code": "NP",
    "iso2": "NP",
    "eng": "Nepal",
    "name": "Nepal",
    "flag": "🇳🇵"
  },
  {
    "id": "NL",
    "code": "NL",
    "iso2": "NL",
    "eng": "Netherlands",
    "name": "Netherlands",
    "flag": "🇳🇱"
  },
  {
    "id": "NC",
    "code": "NC",
    "iso2": "NC",
    "eng": "New Caledonia",
    "name": "New Caledonia",
    "flag": "🇳🇨"
  },
  {
    "id": "NZ",
    "code": "NZ",
    "iso2": "NZ",
    "eng": "New Zealand",
    "name": "New Zealand",
    "flag": "🇳🇿"
  },
  {
    "id": "NI",
    "code": "NI",
    "iso2": "NI",
    "eng": "Nicaragua",
    "name": "Nicaragua",
    "flag": "🇳🇮"
  },
  {
    "id": "NE",
    "code": "NE",
    "iso2": "NE",
    "eng": "Niger",
    "name": "Niger",
    "flag": "🇳🇪"
  },
  {
    "id": "NG",
    "code": "NG",
    "iso2": "NG",
    "eng": "Nigeria",
    "name": "Nigeria",
    "flag": "🇳🇬"
  },
  {
    "id": "NU",
    "code": "NU",
    "iso2": "NU",
    "eng": "Niue",
    "name": "Niue",
    "flag": "🇳🇺"
  },
  {
    "id": "NF",
    "code": "NF",
    "iso2": "NF",
    "eng": "Norfolk Island",
    "name": "Norfolk Island",
    "flag": "🇳🇫"
  },
  {
    "id": "MK",
    "code": "MK",
    "iso2": "MK",
    "eng": "North Macedonia",
    "name": "North Macedonia",
    "flag": "🇲🇰"
  },
  {
    "id": "MP",
    "code": "MP",
    "iso2": "MP",
    "eng": "Northern Mariana Islands",
    "name": "Northern Mariana Islands",
    "flag": "🇲🇵"
  },
  {
    "id": "NO",
    "code": "NO",
    "iso2": "NO",
    "eng": "Norway",
    "name": "Norway",
    "flag": "🇳🇴"
  },
  {
    "id": "OM",
    "code": "OM",
    "iso2": "OM",
    "eng": "Oman",
    "name": "Oman",
    "flag": "🇴🇲"
  },
  {
    "id": "PK",
    "code": "PK",
    "iso2": "PK",
    "eng": "Pakistan",
    "name": "Pakistan",
    "flag": "🇵🇰"
  },
  {
    "id": "PW",
    "code": "PW",
    "iso2": "PW",
    "eng": "Palau",
    "name": "Palau",
    "flag": "🇵🇼"
  },
  {
    "id": "PS",
    "code": "PS",
    "iso2": "PS",
    "eng": "Palestine, State of",
    "name": "Palestine, State of",
    "flag": "🇵🇸"
  },
  {
    "id": "PA",
    "code": "PA",
    "iso2": "PA",
    "eng": "Panama",
    "name": "Panama",
    "flag": "🇵🇦"
  },
  {
    "id": "PG",
    "code": "PG",
    "iso2": "PG",
    "eng": "Papua New Guinea",
    "name": "Papua New Guinea",
    "flag": "🇵🇬"
  },
  {
    "id": "PY",
    "code": "PY",
    "iso2": "PY",
    "eng": "Paraguay",
    "name": "Paraguay",
    "flag": "🇵🇾"
  },
  {
    "id": "PE",
    "code": "PE",
    "iso2": "PE",
    "eng": "Peru",
    "name": "Peru",
    "flag": "🇵🇪"
  },
  {
    "id": "PH",
    "code": "PH",
    "iso2": "PH",
    "eng": "Philippines",
    "name": "Philippines",
    "flag": "🇵🇭"
  },
  {
    "id": "PN",
    "code": "PN",
    "iso2": "PN",
    "eng": "Pitcairn",
    "name": "Pitcairn",
    "flag": "🇵🇳"
  },
  {
    "id": "PL",
    "code": "PL",
    "iso2": "PL",
    "eng": "Poland",
    "name": "Poland",
    "flag": "🇵🇱"
  },
  {
    "id": "PT",
    "code": "PT",
    "iso2": "PT",
    "eng": "Portugal",
    "name": "Portugal",
    "flag": "🇵🇹"
  },
  {
    "id": "PR",
    "code": "PR",
    "iso2": "PR",
    "eng": "Puerto Rico",
    "name": "Puerto Rico",
    "flag": "🇵🇷"
  },
  {
    "id": "QA",
    "code": "QA",
    "iso2": "QA",
    "eng": "Qatar",
    "name": "Qatar",
    "flag": "🇶🇦"
  },
  {
    "id": "RO",
    "code": "RO",
    "iso2": "RO",
    "eng": "Romania",
    "name": "Romania",
    "flag": "🇷🇴"
  },
  {
    "id": "RU",
    "code": "RU",
    "iso2": "RU",
    "eng": "Russian Federation",
    "name": "Russian Federation",
    "flag": "🇷🇺"
  },
  {
    "id": "RW",
    "code": "RW",
    "iso2": "RW",
    "eng": "Rwanda",
    "name": "Rwanda",
    "flag": "🇷🇼"
  },
  {
    "id": "RE",
    "code": "RE",
    "iso2": "RE",
    "eng": "Réunion",
    "name": "Réunion",
    "flag": "🇷🇪"
  },
  {
    "id": "BL",
    "code": "BL",
    "iso2": "BL",
    "eng": "Saint Barthélemy",
    "name": "Saint Barthélemy",
    "flag": "🇧🇱"
  },
  {
    "id": "SH",
    "code": "SH",
    "iso2": "SH",
    "eng": "Saint Helena, Ascension and Tristan da Cunha",
    "name": "Saint Helena, Ascension and Tristan da Cunha",
    "flag": "🇸🇭"
  },
  {
    "id": "KN",
    "code": "KN",
    "iso2": "KN",
    "eng": "Saint Kitts and Nevis",
    "name": "Saint Kitts and Nevis",
    "flag": "🇰🇳"
  },
  {
    "id": "LC",
    "code": "LC",
    "iso2": "LC",
    "eng": "Saint Lucia",
    "name": "Saint Lucia",
    "flag": "🇱🇨"
  },
  {
    "id": "MF",
    "code": "MF",
    "iso2": "MF",
    "eng": "Saint Martin (French part)",
    "name": "Saint Martin (French part)",
    "flag": "🇲🇫"
  },
  {
    "id": "PM",
    "code": "PM",
    "iso2": "PM",
    "eng": "Saint Pierre and Miquelon",
    "name": "Saint Pierre and Miquelon",
    "flag": "🇵🇲"
  },
  {
    "id": "VC",
    "code": "VC",
    "iso2": "VC",
    "eng": "Saint Vincent and the Grenadines",
    "name": "Saint Vincent and the Grenadines",
    "flag": "🇻🇨"
  },
  {
    "id": "WS",
    "code": "WS",
    "iso2": "WS",
    "eng": "Samoa",
    "name": "Samoa",
    "flag": "🇼🇸"
  },
  {
    "id": "SM",
    "code": "SM",
    "iso2": "SM",
    "eng": "San Marino",
    "name": "San Marino",
    "flag": "🇸🇲"
  },
  {
    "id": "ST",
    "code": "ST",
    "iso2": "ST",
    "eng": "Sao Tome and Principe",
    "name": "Sao Tome and Principe",
    "flag": "🇸🇹"
  },
  {
    "id": "SA",
    "code": "SA",
    "iso2": "SA",
    "eng": "Saudi Arabia",
    "name": "Saudi Arabia",
    "flag": "🇸🇦"
  },
  {
    "id": "SN",
    "code": "SN",
    "iso2": "SN",
    "eng": "Senegal",
    "name": "Senegal",
    "flag": "🇸🇳"
  },
  {
    "id": "RS",
    "code": "RS",
    "iso2": "RS",
    "eng": "Serbia",
    "name": "Serbia",
    "flag": "🇷🇸"
  },
  {
    "id": "SC",
    "code": "SC",
    "iso2": "SC",
    "eng": "Seychelles",
    "name": "Seychelles",
    "flag": "🇸🇨"
  },
  {
    "id": "SL",
    "code": "SL",
    "iso2": "SL",
    "eng": "Sierra Leone",
    "name": "Sierra Leone",
    "flag": "🇸🇱"
  },
  {
    "id": "SG",
    "code": "SG",
    "iso2": "SG",
    "eng": "Singapore",
    "name": "Singapore",
    "flag": "🇸🇬"
  },
  {
    "id": "SX",
    "code": "SX",
    "iso2": "SX",
    "eng": "Sint Maarten (Dutch part)",
    "name": "Sint Maarten (Dutch part)",
    "flag": "🇸🇽"
  },
  {
    "id": "SK",
    "code": "SK",
    "iso2": "SK",
    "eng": "Slovakia",
    "name": "Slovakia",
    "flag": "🇸🇰"
  },
  {
    "id": "SI",
    "code": "SI",
    "iso2": "SI",
    "eng": "Slovenia",
    "name": "Slovenia",
    "flag": "🇸🇮"
  },
  {
    "id": "SB",
    "code": "SB",
    "iso2": "SB",
    "eng": "Solomon Islands",
    "name": "Solomon Islands",
    "flag": "🇸🇧"
  },
  {
    "id": "SO",
    "code": "SO",
    "iso2": "SO",
    "eng": "Somalia",
    "name": "Somalia",
    "flag": "🇸🇴"
  },
  {
    "id": "ZA",
    "code": "ZA",
    "iso2": "ZA",
    "eng": "South Africa",
    "name": "South Africa",
    "flag": "🇿🇦"
  },
  {
    "id": "GS",
    "code": "GS",
    "iso2": "GS",
    "eng": "South Georgia and the South Sandwich Islands",
    "name": "South Georgia and the South Sandwich Islands",
    "flag": "🇬🇸"
  },
  {
    "id": "SS",
    "code": "SS",
    "iso2": "SS",
    "eng": "South Sudan",
    "name": "South Sudan",
    "flag": "🇸🇸"
  },
  {
    "id": "ES",
    "code": "ES",
    "iso2": "ES",
    "eng": "Spain",
    "name": "Spain",
    "flag": "🇪🇸"
  },
  {
    "id": "LK",
    "code": "LK",
    "iso2": "LK",
    "eng": "Sri Lanka",
    "name": "Sri Lanka",
    "flag": "🇱🇰"
  },
  {
    "id": "SD",
    "code": "SD",
    "iso2": "SD",
    "eng": "Sudan",
    "name": "Sudan",
    "flag": "🇸🇩"
  },
  {
    "id": "SR",
    "code": "SR",
    "iso2": "SR",
    "eng": "Suriname",
    "name": "Suriname",
    "flag": "🇸🇷"
  },
  {
    "id": "SJ",
    "code": "SJ",
    "iso2": "SJ",
    "eng": "Svalbard and Jan Mayen",
    "name": "Svalbard and Jan Mayen",
    "flag": "🇸🇯"
  },
  {
    "id": "SE",
    "code": "SE",
    "iso2": "SE",
    "eng": "Sweden",
    "name": "Sweden",
    "flag": "🇸🇪"
  },
  {
    "id": "CH",
    "code": "CH",
    "iso2": "CH",
    "eng": "Switzerland",
    "name": "Switzerland",
    "flag": "🇨🇭"
  },
  {
    "id": "SY",
    "code": "SY",
    "iso2": "SY",
    "eng": "Syrian Arab Republic",
    "name": "Syrian Arab Republic",
    "flag": "🇸🇾"
  },
  {
    "id": "TW",
    "code": "TW",
    "iso2": "TW",
    "eng": "Taiwan, Province of China",
    "name": "Taiwan, Province of China",
    "flag": "🇹🇼"
  },
  {
    "id": "TJ",
    "code": "TJ",
    "iso2": "TJ",
    "eng": "Tajikistan",
    "name": "Tajikistan",
    "flag": "🇹🇯"
  },
  {
    "id": "TZ",
    "code": "TZ",
    "iso2": "TZ",
    "eng": "Tanzania, United Republic of",
    "name": "Tanzania, United Republic of",
    "flag": "🇹🇿"
  },
  {
    "id": "TH",
    "code": "TH",
    "iso2": "TH",
    "eng": "Thailand",
    "name": "Thailand",
    "flag": "🇹🇭"
  },
  {
    "id": "TL",
    "code": "TL",
    "iso2": "TL",
    "eng": "Timor-Leste",
    "name": "Timor-Leste",
    "flag": "🇹🇱"
  },
  {
    "id": "TG",
    "code": "TG",
    "iso2": "TG",
    "eng": "Togo",
    "name": "Togo",
    "flag": "🇹🇬"
  },
  {
    "id": "TK",
    "code": "TK",
    "iso2": "TK",
    "eng": "Tokelau",
    "name": "Tokelau",
    "flag": "🇹🇰"
  },
  {
    "id": "TO",
    "code": "TO",
    "iso2": "TO",
    "eng": "Tonga",
    "name": "Tonga",
    "flag": "🇹🇴"
  },
  {
    "id": "TT",
    "code": "TT",
    "iso2": "TT",
    "eng": "Trinidad and Tobago",
    "name": "Trinidad and Tobago",
    "flag": "🇹🇹"
  },
  {
    "id": "TN",
    "code": "TN",
    "iso2": "TN",
    "eng": "Tunisia",
    "name": "Tunisia",
    "flag": "🇹🇳"
  },
  {
    "id": "TM",
    "code": "TM",
    "iso2": "TM",
    "eng": "Turkmenistan",
    "name": "Turkmenistan",
    "flag": "🇹🇲"
  },
  {
    "id": "TC",
    "code": "TC",
    "iso2": "TC",
    "eng": "Turks and Caicos Islands",
    "name": "Turks and Caicos Islands",
    "flag": "🇹🇨"
  },
  {
    "id": "TV",
    "code": "TV",
    "iso2": "TV",
    "eng": "Tuvalu",
    "name": "Tuvalu",
    "flag": "🇹🇻"
  },
  {
    "id": "TR",
    "code": "TR",
    "iso2": "TR",
    "eng": "Türkiye",
    "name": "Türkiye",
    "flag": "🇹🇷"
  },
  {
    "id": "UG",
    "code": "UG",
    "iso2": "UG",
    "eng": "Uganda",
    "name": "Uganda",
    "flag": "🇺🇬"
  },
  {
    "id": "UA",
    "code": "UA",
    "iso2": "UA",
    "eng": "Ukraine",
    "name": "Ukraine",
    "flag": "🇺🇦"
  },
  {
    "id": "AE",
    "code": "AE",
    "iso2": "AE",
    "eng": "United Arab Emirates",
    "name": "United Arab Emirates",
    "flag": "🇦🇪"
  },
  {
    "id": "GB",
    "code": "GB",
    "iso2": "GB",
    "eng": "United Kingdom",
    "name": "United Kingdom",
    "flag": "🇬🇧"
  },
  {
    "id": "US",
    "code": "US",
    "iso2": "US",
    "eng": "United States",
    "name": "United States",
    "flag": "🇺🇸"
  },
  {
    "id": "UM",
    "code": "UM",
    "iso2": "UM",
    "eng": "United States Minor Outlying Islands",
    "name": "United States Minor Outlying Islands",
    "flag": "🇺🇲"
  },
  {
    "id": "UY",
    "code": "UY",
    "iso2": "UY",
    "eng": "Uruguay",
    "name": "Uruguay",
    "flag": "🇺🇾"
  },
  {
    "id": "UZ",
    "code": "UZ",
    "iso2": "UZ",
    "eng": "Uzbekistan",
    "name": "Uzbekistan",
    "flag": "🇺🇿"
  },
  {
    "id": "VU",
    "code": "VU",
    "iso2": "VU",
    "eng": "Vanuatu",
    "name": "Vanuatu",
    "flag": "🇻🇺"
  },
  {
    "id": "VE",
    "code": "VE",
    "iso2": "VE",
    "eng": "Venezuela, Bolivarian Republic of",
    "name": "Venezuela, Bolivarian Republic of",
    "flag": "🇻🇪"
  },
  {
    "id": "VN",
    "code": "VN",
    "iso2": "VN",
    "eng": "Viet Nam",
    "name": "Viet Nam",
    "flag": "🇻🇳"
  },
  {
    "id": "VG",
    "code": "VG",
    "iso2": "VG",
    "eng": "Virgin Islands, British",
    "name": "Virgin Islands, British",
    "flag": "🇻🇬"
  },
  {
    "id": "VI",
    "code": "VI",
    "iso2": "VI",
    "eng": "Virgin Islands, U.S.",
    "name": "Virgin Islands, U.S.",
    "flag": "🇻🇮"
  },
  {
    "id": "WF",
    "code": "WF",
    "iso2": "WF",
    "eng": "Wallis and Futuna",
    "name": "Wallis and Futuna",
    "flag": "🇼🇫"
  },
  {
    "id": "EH",
    "code": "EH",
    "iso2": "EH",
    "eng": "Western Sahara",
    "name": "Western Sahara",
    "flag": "🇪🇭"
  },
  {
    "id": "YE",
    "code": "YE",
    "iso2": "YE",
    "eng": "Yemen",
    "name": "Yemen",
    "flag": "🇾🇪"
  },
  {
    "id": "ZM",
    "code": "ZM",
    "iso2": "ZM",
    "eng": "Zambia",
    "name": "Zambia",
    "flag": "🇿🇲"
  },
  {
    "id": "ZW",
    "code": "ZW",
    "iso2": "ZW",
    "eng": "Zimbabwe",
    "name": "Zimbabwe",
    "flag": "🇿🇼"
  },
  {
    "id": "AX",
    "code": "AX",
    "iso2": "AX",
    "eng": "Åland Islands",
    "name": "Åland Islands",
    "flag": "🇦🇽"
  }
]
);

function getApiKey() {
  const apiKey = String(process.env.BENOTP_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("BENOTP_API_KEY is not configured");
  }

  return apiKey;
}

const httpsAgent = new https.Agent({
  keepAlive: false,
  maxCachedSessions: 0,
  rejectUnauthorized: true,
});

const BENOTP_BASE_URL = String(
  process.env.BENOTP_BASE_URL ||
    "https://benotp.com/stubs/handler_api.php"
)
  .trim()
  .replace(/\/+$/, "");

const api = axios.create({
  baseURL: BENOTP_BASE_URL,
  timeout: 20000,
  httpsAgent,
  maxRedirects: 0,
  validateStatus(status) {
    return status >= 200 && status < 400;
  },
  headers: {
    Accept: "*/*",
    "User-Agent": "PostmanRuntime-compatible/ChapsSmS",
    Connection: "close",
  },
});

function looksLikeHtml(
  responseText,
  contentType = ""
) {
  const value = String(
    responseText || ""
  ).trim();

  const type = String(
    contentType || ""
  ).toLowerCase();

  return (
    type.includes("text/html") ||
    /^<!doctype\s+html/i.test(value) ||
    /^<html[\s>]/i.test(value) ||
    /<body[\s>]/i.test(
      value.slice(0, 1000)
    )
  );
}

function createHtmlResponseError({
  action,
  status,
  location,
} = {}) {
  const normalizedAction =
    String(action || "unknown").trim();

  return createProviderError(
    `BenOTP returned HTML instead of API data for action=${normalizedAction}.`,
    {
      status: 502,
      code:
        "BENOTP_HTML_RESPONSE",
      retryable: false,
      rawResponse: {
        action:
          normalizedAction,
        httpStatus:
          status || null,
        redirectLocation:
          location || null,
        baseURL:
          BENOTP_BASE_URL,
      },
    }
  );
}

function normalizeRequired(value, fieldName) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}


function normalizeBenOtpCountry(country) {
  const value = normalizeRequired(country, "Country").toLowerCase();

  const aliases = {
    usa: "US",
    us: "US",
    "united states": "US",
    "united states of america": "US",
    uk: "GB",
    gb: "GB",
    "united kingdom": "GB",
  };

  return aliases[value] || value.toUpperCase();
}

function getResponseText(data) {
  if (typeof data === "string") {
    return data.trim();
  }

  if (data === null || data === undefined) {
    return "";
  }

  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return String(data).trim();
}

function createProviderError(message, options = {}) {
  const error = new Error(message);

  error.provider = PROVIDER_NAME;
  error.status = options.status || 502;
  error.code = options.code || "BENOTP_ERROR";
  error.retryable = options.retryable ?? false;
  error.rawResponse = options.rawResponse;

  return error;
}

function isRetryableNetworkError(error) {
  const code = String(error.code || "").toUpperCase();

  return new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNABORTED",
    "EPIPE",
    "ENETUNREACH",
    "EAI_AGAIN",
    "ERR_NETWORK",
  ]).has(code);
}

function classifyProviderError(responseText) {
  const value = String(responseText || "").trim();
  const upper = value.toUpperCase();

  if (!value) {
    return createProviderError("BenOTP returned an empty response", {
      code: "EMPTY_RESPONSE",
      retryable: true,
    });
  }

  if (
    upper.includes("NO_NUMBERS") ||
    upper.includes("NO_NUMBER") ||
    upper.includes("NO_STOCK") ||
    upper.includes("OUT_OF_STOCK")
  ) {
    return createProviderError("No BenOTP numbers are currently available", {
      status: 409,
      code: "NO_NUMBERS",
      retryable: true,
      rawResponse: value,
    });
  }

  if (
    upper.includes("NO_BALANCE") ||
    upper.includes("INSUFFICIENT") ||
    upper.includes("NOT_ENOUGH")
  ) {
    return createProviderError("BenOTP provider balance is insufficient", {
      status: 503,
      code: "PROVIDER_BALANCE_LOW",
      retryable: true,
      rawResponse: value,
    });
  }

  if (
    upper.includes("BAD_KEY") ||
    upper.includes("INVALID_KEY") ||
    upper.includes("WRONG_API_KEY") ||
    upper.includes("UNAUTHORIZED")
  ) {
    return createProviderError("BenOTP API key is invalid", {
      status: 500,
      code: "INVALID_API_KEY",
      retryable: false,
      rawResponse: value,
    });
  }

  if (
    upper.includes("BAD_SERVICE") ||
    upper.includes("INVALID_SERVICE")
  ) {
    return createProviderError("BenOTP service is invalid", {
      status: 400,
      code: "INVALID_SERVICE",
      retryable: false,
      rawResponse: value,
    });
  }

  if (
    upper.includes("BAD_COUNTRY") ||
    upper.includes("INVALID_COUNTRY")
  ) {
    return createProviderError("BenOTP country is invalid", {
      status: 400,
      code: "INVALID_COUNTRY",
      retryable: false,
      rawResponse: value,
    });
  }

  if (upper.startsWith("ERROR")) {
    return createProviderError(value, {
      status: 502,
      code: "PROVIDER_ERROR",
      retryable: true,
      rawResponse: value,
    });
  }

  return null;
}

async function request(
  params,
  options = {}
) {
  try {
    const response = await api.get(
      "",
      {
        params: {
          action:
            params.action,
          api_key:
            getApiKey(),
          ...Object.fromEntries(
            Object.entries(
              params
            ).filter(
              ([key]) =>
                key !==
                "action"
            )
          ),
        },
      }
    );

    const responseText =
      getResponseText(
        response.data
      );

    if (
      looksLikeHtml(
        responseText,
        response.headers?.[
          "content-type"
        ]
      )
    ) {
      throw createHtmlResponseError({
        action:
          params.action,
        status:
          response.status,
        location:
          response.headers
            ?.location,
      });
    }

    const providerError =
      classifyProviderError(
        responseText
      );

    if (providerError) {
      throw providerError;
    }

    return {
      data:
        response.data,
      text:
        responseText,
    };
  } catch (error) {
    if (
      error.provider ===
      PROVIDER_NAME
    ) {
      throw error;
    }

    const responseText =
      getResponseText(
        error.response?.data
      );

    const location =
      error.response?.headers
        ?.location ||
      "";

    if (
      looksLikeHtml(
        responseText,
        error.response?.headers?.[
          "content-type"
        ]
      ) ||
      (
        Number(
          error.response
            ?.status
        ) >= 300 &&
        Number(
          error.response
            ?.status
        ) < 400
      )
    ) {
      throw createHtmlResponseError({
        action:
          params.action,
        status:
          error.response
            ?.status,
        location,
      });
    }

    const errorMessage =
      responseText
        ? responseText.slice(
            0,
            500
          )
        : error.message ||
          "BenOTP request failed";

    throw createProviderError(
      errorMessage,
      {
        status:
          error.response
            ?.status ||
          502,
        code:
          error.code ||
          "BENOTP_REQUEST_FAILED",
        retryable:
          options.retryable ??
          (
            isRetryableNetworkError(
              error
            ) ||
            Number(
              error.response
                ?.status
            ) >= 500
          ),
        rawResponse:
          responseText
            ? responseText.slice(
                0,
                1000
              )
            : "",
      }
    );
  }
}

function parseBalance(responseText) {
  const value = String(responseText || "").trim();

  /*
   * Supports likely formats such as:
   * ACCESS_BALANCE:1400
   * BALANCE:1400
   * 1400
   */
  const parts = value.split(":");
  const numericValue = Number(parts[parts.length - 1]);

  if (!Number.isFinite(numericValue)) {
    throw createProviderError(
      `Unable to parse BenOTP balance response: ${value}`,
      {
        code: "INVALID_BALANCE_RESPONSE",
        retryable: false,
        rawResponse: value,
      }
    );
  }

  return numericValue;
}

function parsePrice(responseText) {
  const value = String(responseText || "").trim();

  /*
   * Documented format:
   * ACCESS_PRICE:FINAL_PRICE:STOCK_QUANTITY
   *
   * Example:
   * ACCESS_PRICE:1021.25:50
   */
  const parts = value.split(":");

  if (parts[0]?.toUpperCase() !== "ACCESS_PRICE") {
    throw createProviderError(
      `Unexpected BenOTP price response: ${value}`,
      {
        code: "INVALID_PRICE_RESPONSE",
        retryable: false,
        rawResponse: value,
      }
    );
  }

  const price = Number(parts[1]);
  const stock = Number(parts[2]);

  if (!Number.isFinite(price) || price <= 0) {
    throw createProviderError(
      `Invalid BenOTP price response: ${value}`,
      {
        code: "INVALID_PRICE",
        retryable: false,
        rawResponse: value,
      }
    );
  }

  return {
    price,
    stock: Number.isFinite(stock) ? stock : 0,
    currency: process.env.BENOTP_CURRENCY || "NGN",
    raw: value,
  };
}

function parseSingleNumber(responseText) {
  const value = String(responseText || "").trim();

  /*
   * Documented single-number format:
   * ACCESS_NUMBER:ORDER_ID:PHONE_NUMBER
   */
  const parts = value.split(":");

  if (parts[0]?.toUpperCase() !== "ACCESS_NUMBER") {
    throw createProviderError(
      `Unexpected BenOTP number response: ${value}`,
      {
        code: "INVALID_NUMBER_RESPONSE",
        retryable: true,
        rawResponse: value,
      }
    );
  }

  const providerOrderId = String(parts[1] || "").trim();

  /*
   * Joining the remaining parts is defensive in case the provider
   * ever includes another colon-delimited component.
   */
  const phoneNumber = parts.slice(2).join(":").trim();

  if (!providerOrderId || !phoneNumber) {
    throw createProviderError(
      `BenOTP returned an incomplete number response: ${value}`,
      {
        code: "INCOMPLETE_NUMBER_RESPONSE",
        retryable: true,
        rawResponse: value,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    providerOrderId,
    phoneNumber,
    status: "waiting",
    providerStatus: "STATUS_WAIT_CODE",
    raw: value,
  };
}

function parseBulkNumbers(responseText) {
  const value = String(responseText || "").trim();
  const parts = value.split(":");

  /*
   * Documented bulk format:
   * ACCESS_BATCH:QUANTITY:ORDER_ID1:PHONE1:ORDER_ID2:PHONE2...
   */
  if (parts[0]?.toUpperCase() !== "ACCESS_BATCH") {
    return null;
  }

  const quantity = Number(parts[1]);
  const values = parts.slice(2);
  const orders = [];

  for (let index = 0; index < values.length; index += 2) {
    const providerOrderId = String(values[index] || "").trim();
    const phoneNumber = String(values[index + 1] || "").trim();

    if (providerOrderId && phoneNumber) {
      orders.push({
        provider: PROVIDER_NAME,
        providerOrderId,
        phoneNumber,
        status: "waiting",
        providerStatus: "STATUS_WAIT_CODE",
      });
    }
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    orders.length === 0
  ) {
    throw createProviderError(
      `Invalid BenOTP bulk-number response: ${value}`,
      {
        code: "INVALID_BATCH_RESPONSE",
        retryable: true,
        rawResponse: value,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    quantity,
    orders,
    raw: value,
  };
}

function parseStatus(responseText) {
  const value = String(responseText || "").trim();
  const upper = value.toUpperCase();

  if (upper === "STATUS_WAIT_CODE") {
    return {
      provider: PROVIDER_NAME,
      status: "waiting",
      providerStatus: "STATUS_WAIT_CODE",
      otpCode: "",
      sms: "",
      raw: value,
    };
  }

  if (upper.startsWith("STATUS_OK:")) {
    const otpCode = value.slice(value.indexOf(":") + 1).trim();

    return {
      provider: PROVIDER_NAME,
      status: "received",
      providerStatus: "STATUS_OK",
      otpCode,
      sms: otpCode,
      raw: value,
    };
  }

  if (upper === "STATUS_CANCEL") {
    return {
      provider: PROVIDER_NAME,
      status: "cancelled",
      providerStatus: "STATUS_CANCEL",
      otpCode: "",
      sms: "",
      raw: value,
    };
  }

  if (upper === "NO_ACTIVATION") {
    return {
      provider: PROVIDER_NAME,
      status: "expired",
      providerStatus: "NO_ACTIVATION",
      otpCode: "",
      sms: "",
      raw: value,
    };
  }

  throw createProviderError(
    `Unexpected BenOTP status response: ${value}`,
    {
      code: "INVALID_STATUS_RESPONSE",
      retryable: true,
      rawResponse: value,
    }
  );
}

async function getBalance() {
  const response = await request(
    {
      action: "getBalance",
    },
    {
      retryable: true,
    }
  );

  return {
    provider: PROVIDER_NAME,
    balance: parseBalance(response.text),
    currency: process.env.BENOTP_CURRENCY || "NGN",
    raw: response.text,
  };
}

async function getServices() {
  const response = await request(
    {
      action: "getServices",
    },
    {
      retryable: true,
    }
  );

  let services = response.data;

  if (typeof services === "string") {
    try {
      services = JSON.parse(services);
    } catch {
      throw createProviderError(
        `Unable to parse BenOTP services response: ${response.text}`,
        {
          code: "INVALID_SERVICES_RESPONSE",
          retryable: true,
          rawResponse: response.text,
        }
      );
    }
  }

  if (!services || typeof services !== "object") {
    throw createProviderError(
      "BenOTP returned an invalid services response",
      {
        code: "INVALID_SERVICES_RESPONSE",
        retryable: true,
        rawResponse: response.text,
      }
    );
  }

  return services;
}

async function getCountries() {
  /*
   * Confirmed with BenOTP's working handler:
   *
   *   https://benotp.com/stubs/handler_api.php
   *
   * getBalance  -> works
   * getServices -> works
   * getCountries -> UNKNOWN_ACTION
   *
   * Do NOT call the unsupported getCountries action anymore.
   * Return a local ISO-3166 country selector instead.
   *
   * Availability is still checked against BenOTP later through
   * getPrice/getNumber, so this list is only for selection.
   */
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.log(
      `[BenOTP] using local ISO-3166 country catalog (${BENOTP_FALLBACK_COUNTRIES.length} countries); provider getCountries is not called.`
    );
  }

  return BENOTP_FALLBACK_COUNTRIES;
}

async function getPrice({
  service,
  country,
  areaCode,
  pool,
}) {
  const normalizedService = normalizeRequired(service, "Service");
  const normalizedCountry = normalizeBenOtpCountry(country);

  const response = await request(
    {
      action: "getPrice",
      service: normalizedService,
      country: normalizedCountry,
      ...(areaCode ? { areacode: String(areaCode).trim() } : {}),
      ...(pool ? { pool: String(pool).trim() } : {}),
    },
    {
      retryable: true,
    }
  );

  return {
    provider: PROVIDER_NAME,
    service: normalizedService,
    country: normalizedCountry,
    ...parsePrice(response.text),
  };
}

async function buyNumber({
  service,
  country,
  areaCode,
  quantity = 1,
  pool,
}) {
  const normalizedQuantity = Number(quantity);

  if (
    !Number.isInteger(normalizedQuantity) ||
    normalizedQuantity < 1 ||
    normalizedQuantity > 10
  ) {
    throw createProviderError(
      "BenOTP quantity must be an integer between 1 and 10",
      {
        status: 400,
        code: "INVALID_QUANTITY",
        retryable: false,
      }
    );
  }

  const normalizedService = normalizeRequired(service, "Service");
  const normalizedCountry = normalizeBenOtpCountry(country);

  const response = await request(
    {
      action: "getNumber",
      service: normalizedService,
      country: normalizedCountry,
      quantity: normalizedQuantity,
      ...(areaCode ? { areacode: String(areaCode).trim() } : {}),
      ...(pool ? { pool: String(pool).trim() } : {}),
    },
    {
      /*
       * A network failure during number purchase is ambiguous.
       * Do not automatically retry because the provider may already
       * have created and charged the activation.
       */
      retryable: false,
    }
  );

  const bulkResult = parseBulkNumbers(response.text);

  if (bulkResult) {
    return bulkResult;
  }

  return parseSingleNumber(response.text);
}

async function getOrder(orderId) {
  const response = await request(
    {
      action: "getStatus",
      order_id: normalizeRequired(orderId, "BenOTP order ID"),
    },
    {
      retryable: true,
    }
  );

  return {
    providerOrderId: String(orderId),
    ...parseStatus(response.text),
  };
}

async function getSms(orderId) {
  return getOrder(orderId);
}

async function cancelOrder(orderId) {
  const normalizedOrderId = normalizeRequired(
    orderId,
    "BenOTP order ID"
  );

  const response = await request(
    {
      action: "setStatus",
      order_id: normalizedOrderId,
      status: 8,
    },
    {
      /*
       * Cancellation is a mutation. Do not automatically repeat it after
       * an uncertain network failure.
       */
      retryable: false,
    }
  );

  const value = response.text.trim();
  const upper = value.toUpperCase();

  if (upper === "ACCESS_CANCEL") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "cancelled",
      providerStatus: "ACCESS_CANCEL",
      refundConfirmed: true,
      raw: value,
    };
  }

  if (upper === "STATUS_CANCEL") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "cancelled",
      providerStatus: "STATUS_CANCEL",
      refundConfirmed: true,
      raw: value,
    };
  }

  if (upper === "CANCEL_FAILED:OTP_ALREADY_RECEIVED") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "received",
      providerStatus: "CANCEL_FAILED:OTP_ALREADY_RECEIVED",
      refundConfirmed: false,
      raw: value,
    };
  }

  if (upper === "NO_ACTIVATION") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "expired",
      providerStatus: "NO_ACTIVATION",
      refundConfirmed: false,
      raw: value,
    };
  }

  throw createProviderError(
    `Unexpected BenOTP cancellation response: ${value}`,
    {
      code: "INVALID_CANCEL_RESPONSE",
      retryable: false,
      rawResponse: value,
    }
  );
}

module.exports = {
  name: PROVIDER_NAME,
  getBalance,
  getServices,
  getCountries,
  getPrice,
  buyNumber,
  getOrder,
  getSms,
  cancelOrder,
};