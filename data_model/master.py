import random, math, datetime as dt
random.seed(11)
TODAY = dt.date(2026,10,14)
W0 = dt.date(2026,10,12)           # Monday of current planning week (index 0)
NW = 36
WEEKS = [W0 + dt.timedelta(weeks=i) for i in range(NW)]
def wlabel(d):
    y,w,_ = d.isocalendar(); return f"{y}-W{w:02d}"

PLANTS = {"P1":"Plant 1 – 10th of Ramadan","P2":"Plant 2 – Alexandria","P3":"Plant 3 – Sadat City"}
LINES = {  # id: (plant, name)
 "P1-A":("P1","Bottling A"),"P1-B":("P1","Bottling B"),"P1-C":("P1","Juice Filling"),
 "P2-A":("P2","Extrusion (Puffs)"),"P2-D":("P2","Fryer (Chips)"),"P2-B":("P2","Biscuit Baking"),"P2-C":("P2","Wafer & Cream"),
 "P3-A":("P3","Liquid Blending"),"P3-B":("P3","Powder & Personal Care")}

# suppliers: name,country,base lead time (days),OTIF
SUP = [
 ("Delta Sugar & Sweeteners","Egypt",7,96),("Gulf Acid Chemicals","UAE",28,91),
 ("Mediterranean Fruit Concentrates","Turkey",35,88),("Aroma Flavours Intl","Germany",49,93),
 ("Nile Industrial Gases","Egypt",3,98),("SinoPack Preforms","China",56,79),
 ("Cairo Closures & Caps","Egypt",10,90),("Alex Label & Film","Egypt",12,92),
 ("Pyramid Corrugated","Egypt",7,95),("Mill & Grain Co","Egypt",7,94),
 ("Palm Oil Trading","Malaysia",42,84),("Dairy Ingredients BV","Netherlands",45,90),
 ("Spice Route Seasonings","India",42,82),("Surfactant Tech","Saudi Arabia",21,89),
 ("Chem Source Egypt","Egypt",10,87),("Fragrance House","France",49,91),
 ("PlastiForm HDPE","Egypt",14,83),("FlexiPack Films","Turkey",28,76)]
SUPPLIERS = [dict(SupplierID=f"SUP-{i+1:02d}",SupplierName=n,Country=c,AverageLeadTime=lt,OTIFPercentage=o)
             for i,(n,c,lt,o) in enumerate(SUP)]

# materials: name,type,category,uom,unit cost EGP,criticality,supplier no,plant
M = []
def add(plant,rows):
    for r in rows: M.append((r[0],r[1],r[2],r[3],r[4],r[5],r[6],plant))
add("P1",[
 ("Sugar","RM","Sweeteners","kg",32,"High",1),("Sucralose","RM","Sweeteners","kg",2600,"Medium",2),
 ("Citric Acid","RM","Acids & Additives","kg",58,"Medium",2),("Phosphoric Acid","RM","Acids & Additives","kg",74,"Medium",2),
 ("Sodium Benzoate","RM","Acids & Additives","kg",96,"Low",2),("Ascorbic Acid","RM","Acids & Additives","kg",410,"Low",2),
 ("Pectin Stabilizer","RM","Acids & Additives","kg",520,"Low",12),
 ("Orange Concentrate","RM","Concentrates & Pulp","kg",185,"High",3),("Apple Concentrate","RM","Concentrates & Pulp","kg",160,"High",3),
 ("Mango Pulp","RM","Concentrates & Pulp","kg",140,"High",3),
 ("Cola Flavour Base","RM","Flavours","kg",780,"High",4),("Lemon Lime Flavour","RM","Flavours","kg",690,"Medium",4),
 ("Caramel Colour","RM","Flavours","kg",120,"Low",4),("Food Grade CO2","RM","Gases","kg",9,"High",5),
 ("PET Preform 500ml","PM","Bottles & Preforms","pcs",3.1,"High",6),("PET Preform 1.5L","PM","Bottles & Preforms","pcs",7.4,"High",6),
 ("PET Bottle 1L Hot-fill","PM","Bottles & Preforms","pcs",5.6,"High",6),("Cap 28mm","PM","Closures","pcs",0.62,"High",7),
 ("Label BOPP Beverage","PM","Labels & Film","pcs",0.48,"Medium",8),("Shrink Film Beverage","PM","Labels & Film","kg",88,"Medium",18),
 ("Carton Tray 12-pack","PM","Cartons & Trays","pcs",14,"Medium",9)])
add("P2",[
 ("Wheat Flour","RM","Flour & Grains","kg",18,"High",10),("Corn Grits","RM","Flour & Grains","kg",21,"High",10),
 ("Potato Flakes","RM","Flour & Grains","kg",46,"High",10),("Salt","RM","Seasonings","kg",5,"Low",15),
 ("Palm Oil","RM","Oils & Fats","kg",52,"High",11),("Fine Sugar","RM","Sweeteners","kg",34,"Medium",1),
 ("Glucose Syrup","RM","Sweeteners","kg",29,"Medium",1),("Cocoa Powder","RM","Dairy & Cocoa","kg",190,"High",12),
 ("Milk Powder","RM","Dairy & Cocoa","kg",210,"Medium",12),("Whey Powder","RM","Dairy & Cocoa","kg",95,"Low",12),
 ("Leavening Agent","RM","Acids & Additives","kg",42,"Low",15),("Lecithin","RM","Oils & Fats","kg",88,"Low",15),
 ("Cheese Seasoning","RM","Seasonings","kg",170,"High",13),("BBQ Seasoning","RM","Seasonings","kg",155,"Medium",13),
 ("Vanilla Flavour","RM","Flavours","kg",640,"Low",4),
 ("Snack Pouch Film","PM","Flexible Film","kg",132,"High",18),("Biscuit Wrapper Film","PM","Flexible Film","kg",126,"High",18),
 ("Cream Biscuit Tray","PM","Cartons & Trays","pcs",1.9,"Medium",17),("Carton Snack 24-pack","PM","Cartons & Trays","pcs",11,"Medium",9),
 ("Carton Biscuit 12-pack","PM","Cartons & Trays","pcs",9.5,"Medium",9),("Printed Sleeve","PM","Labels & Film","pcs",0.9,"Low",8),
 ("Sealing Tape","PM","Labels & Film","pcs",24,"Low",8)])
add("P3",[
 ("LAS Acid","RM","Surfactants","kg",64,"High",14),("SLES 70%","RM","Surfactants","kg",58,"High",14),
 ("Soda Ash","RM","Chemicals","kg",14,"Medium",15),("Sodium Silicate","RM","Chemicals","kg",11,"Low",15),
 ("Sodium Sulfate","RM","Chemicals","kg",8,"Medium",15),("Enzyme Blend","RM","Chemicals","kg",640,"Medium",14),
 ("Fragrance Lemon","RM","Fragrances","kg",720,"Medium",16),("Fragrance Floral","RM","Fragrances","kg",760,"Medium",16),
 ("Glycerin","RM","Surfactants","kg",72,"Low",14),("Cocamidopropyl Betaine","RM","Surfactants","kg",96,"Medium",14),
 ("Colorant Blend","RM","Chemicals","kg",210,"Low",15),("Preservative","RM","Chemicals","kg",150,"Low",15),
 ("Titanium Dioxide","RM","Chemicals","kg",170,"Low",15),("Aloe Extract","RM","Fragrances","kg",340,"Low",16),
 ("Salt Thickener","RM","Chemicals","kg",6,"Low",15),
 ("HDPE Bottle 1L","PM","Bottles & Preforms","pcs",4.8,"High",17),("HDPE Bottle 500ml","PM","Bottles & Preforms","pcs",3.4,"High",17),
 ("HDPE Bottle 400ml","PM","Bottles & Preforms","pcs",3.2,"High",17),("Trigger / Pump Cap","PM","Closures","pcs",1.7,"High",17),
 ("Label Home Care","PM","Labels & Film","pcs",0.55,"Medium",8),("Carton Home Care 12-pack","PM","Cartons & Trays","pcs",12,"Medium",9),
 ("Powder Bag 2kg","PM","Flexible Film","pcs",3.9,"High",18)])
