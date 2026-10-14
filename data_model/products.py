from master import *
P="PET Preform 500ml"; P15="PET Preform 1.5L"; B1="PET Bottle 1L Hot-fill"
bev500=lambda sug,extra:[("Sugar",sug),("Food Grade CO2",.12),(P,24),("Cap 28mm",24),("Label BOPP Beverage",24),("Shrink Film Beverage",.05),("Carton Tray 12-pack",1)]+extra
bev15=lambda sug,extra:[("Sugar",sug),("Food Grade CO2",.09),(P15,6),("Cap 28mm",6),("Label BOPP Beverage",6),("Shrink Film Beverage",.04),("Carton Tray 12-pack",1)]+extra
juice=lambda extra:[(B1,12),("Cap 28mm",12),("Label BOPP Beverage",12),("Shrink Film Beverage",.06),("Carton Tray 12-pack",1),("Citric Acid",.04),("Ascorbic Acid",.01)]+extra
snack=lambda extra,film=.19:[("Snack Pouch Film",film),("Carton Snack 24-pack",1),("Salt",.04)]+extra
bisc=lambda extra:[("Biscuit Wrapper Film",.13),("Carton Biscuit 12-pack",1)]+extra
hc=lambda bot,n,extra:[(bot,n),("Trigger / Pump Cap",n),("Label Home Care",n),("Carton Home Care 12-pack",1)]+extra
# name,category,brand,plant,line,batch,base wk demand,rate cases/h,changeover h,season,bom
FG=[
("Cola 500ml 24pk","Carbonated Beverages","Nile Spark","P1","P1-A",2000,12000,300,2.0,"bev",bev500(1.30,[("Phosphoric Acid",.014),("Cola Flavour Base",.055),("Caramel Colour",.05),("Sodium Benzoate",.005)])),
("Cola 1.5L 6pk","Carbonated Beverages","Nile Spark","P1","P1-B",2000,8000,260,2.0,"bev",bev15(.97,[("Phosphoric Acid",.010),("Cola Flavour Base",.041),("Caramel Colour",.038),("Sodium Benzoate",.004)])),
("Lemon Lime 500ml 24pk","Carbonated Beverages","Nile Spark","P1","P1-A",2000,7000,300,2.0,"bev",bev500(1.25,[("Citric Acid",.03),("Lemon Lime Flavour",.05),("Sodium Benzoate",.005)])),
("Lemon Lime 1.5L 6pk","Carbonated Beverages","Nile Spark","P1","P1-B",2000,4500,260,2.0,"bev",bev15(.95,[("Citric Acid",.025),("Lemon Lime Flavour",.04),("Sodium Benzoate",.004)])),
("Orange Soda 500ml 24pk","Carbonated Beverages","Nile Spark","P1","P1-B",2000,5500,300,2.0,"bev",bev500(1.10,[("Orange Concentrate",.35),("Citric Acid",.03),("Ascorbic Acid",.004),("Sodium Benzoate",.005)])),
("Sparkling Apple 500ml 24pk","Carbonated Beverages","Nile Spark","P1","P1-A",1500,3000,300,2.0,"bev",bev500(.60,[("Apple Concentrate",.45),("Citric Acid",.02),("Ascorbic Acid",.004),("Sucralose",.0012)])),
("Orange Juice 1L 12pk","Juices & Nectars","Delta Fresh","P1","P1-C",1000,4500,160,2.5,"ram",juice([("Orange Concentrate",1.9),("Sugar",.4),("Pectin Stabilizer",.02)])),
("Apple Juice 1L 12pk","Juices & Nectars","Delta Fresh","P1","P1-C",1000,3500,160,2.5,"ram",juice([("Apple Concentrate",1.9),("Sugar",.35),("Pectin Stabilizer",.02)])),
("Mango Nectar 1L 12pk","Juices & Nectars","Delta Fresh","P1","P1-C",1000,3000,160,2.5,"ram",juice([("Mango Pulp",3.0),("Sugar",.9),("Pectin Stabilizer",.03)])),
("Salted Chips 40g 48pk","Snacks","Crunchy Co","P2","P2-D",1000,6000,140,1.5,"flat",snack([("Potato Flakes",1.1),("Palm Oil",.55)])),
("BBQ Chips 40g 48pk","Snacks","Crunchy Co","P2","P2-D",1000,4500,140,1.5,"flat",snack([("Potato Flakes",1.1),("Palm Oil",.55),("BBQ Seasoning",.09)])),
("Cheese Puffs 30g 48pk","Snacks","Crunchy Co","P2","P2-A",1000,5000,140,1.5,"flat",snack([("Corn Grits",1.0),("Palm Oil",.35),("Cheese Seasoning",.12)],.17)),
("Corn Rings 30g 48pk","Snacks","Crunchy Co","P2","P2-A",1000,3500,140,1.5,"flat",snack([("Corn Grits",1.0),("Palm Oil",.33),("Cheese Seasoning",.06),("BBQ Seasoning",.06)],.17)),
("Potato Sticks 60g 24pk","Snacks","Crunchy Co","P2","P2-D",800,2500,120,1.5,"flat",snack([("Potato Flakes",1.5),("Palm Oil",.6)],.22)),
("Choco Cream Biscuit 24pk","Biscuits & Cookies","Baker's Choice","P2","P2-C",1000,5500,120,1.0,"ram",bisc([("Wheat Flour",.8),("Fine Sugar",.45),("Palm Oil",.3),("Cocoa Powder",.06),("Glucose Syrup",.12),("Milk Powder",.05),("Lecithin",.01),("Leavening Agent",.008),("Cream Biscuit Tray",24),("Printed Sleeve",24)])),
("Vanilla Cream Biscuit 24pk","Biscuits & Cookies","Baker's Choice","P2","P2-C",1000,4500,120,1.0,"ram",bisc([("Wheat Flour",.8),("Fine Sugar",.5),("Palm Oil",.32),("Vanilla Flavour",.004),("Milk Powder",.05),("Glucose Syrup",.1),("Lecithin",.01),("Leavening Agent",.008),("Cream Biscuit Tray",24),("Printed Sleeve",24)])),
("Butter Cookies 12pk","Biscuits & Cookies","Baker's Choice","P2","P2-B",1000,4000,130,1.0,"ram",bisc([("Wheat Flour",1.0),("Fine Sugar",.4),("Palm Oil",.35),("Whey Powder",.05),("Leavening Agent",.01),("Lecithin",.01),("Vanilla Flavour",.004),("Sealing Tape",1)])),
("Digestive Biscuit 12pk","Biscuits & Cookies","Baker's Choice","P2","P2-B",1000,3500,130,1.0,"ram",bisc([("Wheat Flour",1.2),("Fine Sugar",.25),("Palm Oil",.3),("Salt",.02),("Leavening Agent",.015),("Sealing Tape",1)])),
("Dish Wash Lemon 500ml 12pk","Home Care","PureHome","P3","P3-A",800,4000,220,1.5,"flat",hc("HDPE Bottle 500ml",12,[("LAS Acid",.55),("SLES 70%",.35),("Salt Thickener",.2),("Fragrance Lemon",.02),("Colorant Blend",.004),("Preservative",.006)])),
("Dish Wash Lemon 1L 12pk","Home Care","PureHome","P3","P3-A",800,3500,200,1.5,"flat",hc("HDPE Bottle 1L",12,[("LAS Acid",1.1),("SLES 70%",.7),("Salt Thickener",.4),("Fragrance Lemon",.04),("Colorant Blend",.008),("Preservative",.012)])),
("Floor Cleaner Floral 1L 12pk","Home Care","PureHome","P3","P3-A",800,3000,200,1.5,"flat",hc("HDPE Bottle 1L",12,[("SLES 70%",.4),("Cocamidopropyl Betaine",.2),("Fragrance Floral",.05),("Colorant Blend",.01),("Preservative",.01)])),
("Laundry Liquid 1L 12pk","Home Care","PureHome","P3","P3-A",800,3200,200,1.5,"flat",hc("HDPE Bottle 1L",12,[("LAS Acid",1.3),("SLES 70%",.8),("Enzyme Blend",.06),("Fragrance Floral",.05),("Preservative",.015),("Colorant Blend",.008),("Salt Thickener",.3)])),
("Laundry Powder 2kg 6pk","Home Care","PureHome","P3","P3-B",600,3000,90,2.0,"flat",[("LAS Acid",.9),("Soda Ash",3.6),("Sodium Silicate",1.0),("Sodium Sulfate",5.0),("Enzyme Blend",.06),("Fragrance Floral",.06),("Titanium Dioxide",.12),("Powder Bag 2kg",6),("Carton Home Care 12-pack",1)]),
("Hand Wash Aloe 500ml 12pk","Personal Care","Lumo","P3","P3-B",800,2500,150,1.5,"flat",hc("HDPE Bottle 500ml",12,[("SLES 70%",.35),("Cocamidopropyl Betaine",.3),("Glycerin",.15),("Aloe Extract",.06),("Fragrance Floral",.02),("Preservative",.006),("Salt Thickener",.15)])),
("Shower Gel Floral 400ml 12pk","Personal Care","Lumo","P3","P3-B",800,2200,150,1.5,"flat",hc("HDPE Bottle 400ml",12,[("SLES 70%",.4),("Cocamidopropyl Betaine",.3),("Glycerin",.2),("Fragrance Floral",.04),("Aloe Extract",.03),("Colorant Blend",.003),("Preservative",.007),("Salt Thickener",.2)])),
("Shampoo 400ml 12pk","Personal Care","Lumo","P3","P3-B",800,2800,150,1.5,"flat",hc("HDPE Bottle 400ml",12,[("SLES 70%",.45),("Cocamidopropyl Betaine",.25),("Glycerin",.1),("Fragrance Floral",.03),("Aloe Extract",.02),("Titanium Dioxide",.01),("Preservative",.007),("Salt Thickener",.22)])),
]
