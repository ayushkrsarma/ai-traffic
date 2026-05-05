export interface Intersection {
  name: string;
  lat: number;
  lon: number;
  id: string;
}

export interface CityPreset {
  name: string;
  intersections: Intersection[];
}

export const CITY_PRESETS: CityPreset[] = [
  {
    name: "New Delhi",
    intersections: [
      { name: "Connaught Place Circle", lat: 28.6327, lon: 77.2197, id: "ND-CP-01" },
      { name: "India Gate Hexagon", lat: 28.6129, lon: 77.2295, id: "ND-IG-02" },
      { name: "AIIMS Intersection", lat: 28.5672, lon: 77.2100, id: "ND-AI-03" },
      { name: "Dhaula Kuan Interchange", lat: 28.5918, lon: 77.1615, id: "ND-DK-04" }
    ]
  },
  {
    name: "Mumbai",
    intersections: [
      { name: "CST Terminal Junction", lat: 18.9401, lon: 72.8347, id: "MB-CST-01" },
      { name: "Worli Naka", lat: 19.0011, lon: 72.8173, id: "MB-WR-02" },
      { name: "Bandra Kurla Complex", lat: 19.0596, lon: 72.8682, id: "MB-BKC-03" },
      { name: "Gateway of India Plaza", lat: 18.9220, lon: 72.8347, id: "MB-GI-04" }
    ]
  },
  {
    name: "Bengaluru",
    intersections: [
      { name: "Silk Board Junction", lat: 12.9174, lon: 77.6238, id: "BL-SB-01" },
      { name: "Hebbal Flyover", lat: 13.0358, lon: 77.5970, id: "BL-HB-02" },
      { name: "Marathahalli Bridge", lat: 12.9562, lon: 77.7011, id: "BL-MH-03" },
      { name: "Majestic Intersection", lat: 12.9767, lon: 77.5713, id: "BL-MJ-04" }
    ]
  },
  {
    name: "Chennai",
    intersections: [
      { name: "Kathipara Junction", lat: 13.0067, lon: 80.2033, id: "CH-KP-01" },
      { name: "Gemini Flyover", lat: 13.0519, lon: 80.2496, id: "CH-GF-02" },
      { name: "Koyambedu Roundabout", lat: 13.0732, lon: 80.2001, id: "CH-KY-03" }
    ]
  },
  {
    name: "Hyderabad",
    intersections: [
      { name: "HITEC City Junction", lat: 17.4435, lon: 78.3772, id: "HY-HC-01" },
      { name: "Jubilee Hills Checkpost", lat: 17.4278, lon: 78.4122, id: "HY-JH-02" },
      { name: "Gachibowli Circle", lat: 17.4401, lon: 78.3489, id: "HY-GB-03" }
    ]
  },
  {
    name: "Kolkata",
    intersections: [
      { name: "Howrah Bridge Plaza", lat: 22.5851, lon: 88.3468, id: "KO-HB-01" },
      { name: "Shyambazar Five-Point", lat: 22.6015, lon: 88.3712, id: "KO-SB-02" },
      { name: "Park Street Crossing", lat: 22.5539, lon: 88.3512, id: "KO-PS-03" }
    ]
  },
  {
    name: "Ahmedabad",
    intersections: [
      { name: "ISKCON Cross Road", lat: 23.0246, lon: 72.5068, id: "AH-IS-01" },
      { name: "Kalupur Circle", lat: 23.0269, lon: 72.5964, id: "AH-KC-02" }
    ]
  },
  {
    name: "Pune",
    intersections: [
      { name: "University Circle", lat: 18.5414, lon: 73.8277, id: "PN-UC-01" },
      { name: "Swargate Chowk", lat: 18.4996, lon: 73.8587, id: "PN-SW-02" },
      { name: "Hinjewadi Phase 1", lat: 18.5913, lon: 73.7389, id: "PN-HJ-03" }
    ]
  },
  {
    name: "Jaipur",
    intersections: [
      { name: "Statue Circle", lat: 26.9090, lon: 75.8066, id: "JP-SC-01" },
      { name: "Rambagh Circle", lat: 26.8967, lon: 75.8083, id: "JP-RB-02" }
    ]
  },
  {
    name: "Lucknow",
    intersections: [
      { name: "Hazratganj Crossing", lat: 26.8517, lon: 80.9443, id: "LK-HZ-01" },
      { name: "Polytechnic Chowk", lat: 26.8770, lon: 80.9984, id: "LK-PC-02" }
    ]
  },
  {
    name: "Chandigarh",
    intersections: [
      { name: "Tribune Chowk", lat: 30.7061, lon: 76.7869, id: "CH-TC-01" },
      { name: "Transport Light", lat: 30.7258, lon: 76.8091, id: "CH-TL-02" }
    ]
  },
  {
    name: "Amaravati",
    intersections: [{ name: "Seed Access Road Junction", lat: 16.5448, lon: 80.5186, id: "AP-AM-01" }]
  },
  {
    name: "Itanagar",
    intersections: [{ name: "Bank Tiniali", lat: 27.0844, lon: 93.6053, id: "AR-IT-01" }]
  },
  {
    name: "Dispur",
    intersections: [{ name: "Ganeshguri Flyover", lat: 26.1508, lon: 91.7825, id: "AS-DI-01" }]
  },
  {
    name: "Patna",
    intersections: [{ name: "Income Tax Golamber", lat: 25.6111, lon: 85.1333, id: "BR-PA-01" }]
  },
  {
    name: "Raipur",
    intersections: [{ name: "Ghadi Chowk", lat: 21.2379, lon: 81.6337, id: "CT-RA-01" }]
  },
  {
    name: "Panaji",
    intersections: [{ name: "KTC Bus Stand Circle", lat: 15.4909, lon: 73.8278, id: "GA-PN-01" }]
  },
  {
    name: "Gandhinagar",
    intersections: [{ name: "Ch-0 Circle", lat: 23.2156, lon: 72.6369, id: "GJ-GA-01" }]
  },
  {
    name: "Shimla",
    intersections: [{ name: "Victory Tunnel", lat: 31.1048, lon: 77.1734, id: "HP-SH-01" }]
  },
  {
    name: "Ranchi",
    intersections: [{ name: "Albert Ekka Chowk", lat: 23.3667, lon: 85.3333, id: "JH-RA-01" }]
  },
  {
    name: "Thiruvananthapuram",
    intersections: [{ name: "East Fort Junction", lat: 8.4833, lon: 76.9500, id: "KL-TV-01" }]
  },
  {
    name: "Bhopal",
    intersections: [{ name: "Board Office Square", lat: 23.2333, lon: 77.4333, id: "MP-BH-01" }]
  },
  {
    name: "Imphal",
    intersections: [{ name: "Kangla Fort Gate", lat: 24.8170, lon: 93.9368, id: "MN-IM-01" }]
  },
  {
    name: "Shillong",
    intersections: [{ name: "Police Bazar Point", lat: 25.5788, lon: 91.8831, id: "ML-SH-01" }]
  },
  {
    name: "Aizawl",
    intersections: [{ name: "Dawrpui Veng", lat: 23.7271, lon: 92.7176, id: "MZ-AI-01" }]
  },
  {
    name: "Kohima",
    intersections: [{ name: "Razhu Point", lat: 25.6747, lon: 94.1103, id: "NL-KO-01" }]
  },
  {
    name: "Bhubaneswar",
    intersections: [{ name: "Master Canteen Square", lat: 20.2724, lon: 85.8338, id: "OD-BB-01" }]
  },
  {
    name: "Gangtok",
    intersections: [{ name: "MG Marg Junction", lat: 27.3314, lon: 88.6138, id: "SK-GA-01" }]
  },
  {
    name: "Agartala",
    intersections: [{ name: "Radhanagar Station", lat: 23.8315, lon: 91.2868, id: "TR-AG-01" }]
  },
  {
    name: "Dehradun",
    intersections: [{ name: "Clock Tower Crossing", lat: 30.3165, lon: 78.0322, id: "UK-DD-01" }]
  },
  {
    name: "Srinagar",
    intersections: [{ name: "Lal Chowk", lat: 34.0837, lon: 74.7973, id: "JK-SR-01" }]
  },
  {
    name: "Jammu",
    intersections: [{ name: "Bari Brahmana", lat: 32.7266, lon: 74.8570, id: "JK-JM-01" }]
  },
  {
    name: "Leh",
    intersections: [{ name: "Main Bazaar Road", lat: 34.1642, lon: 77.5848, id: "LA-LE-01" }]
  },
  {
    name: "Port Blair",
    intersections: [{ name: "Aberdeen Bazaar", lat: 11.6675, lon: 92.7359, id: "AN-PB-01" }]
  },
  {
    name: "Puducherry",
    intersections: [{ name: "Rock Beach Point", lat: 11.9416, lon: 79.8373, id: "PY-PD-01" }]
  },
  {
    name: "Daman",
    intersections: [{ name: "Nani Daman Fort", lat: 20.4000, lon: 72.8333, id: "DN-DA-01" }]
  },
  {
    name: "Kavaratti",
    intersections: [{ name: "Kavaratti Port Area", lat: 10.5667, lon: 72.6417, id: "LD-KA-01" }]
  },
  {
    name: "New York",
    intersections: [
      { name: "Times Square", lat: 40.7580, lon: -73.9855, id: "NY-TS-01" }
    ]
  },
  {
    name: "London",
    intersections: [
      { name: "Piccadilly Circus", lat: 51.5101, lon: -0.1342, id: "LN-PC-01" }
    ]
  }
];
