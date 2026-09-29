const {expo}=require('./app.json');
const retailer=require('./src/retailer.json');
module.exports={...expo,...(retailer.id?{name:`${retailer.name} | Your Pet Care`,slug:`yourpetcare-${retailer.id}`,scheme:`yourpetcare-${retailer.id}`,ios:{...expo.ios,bundleIdentifier:`com.yourpetcare.${retailer.id}`},android:{...expo.android,package:`com.yourpetcare.${retailer.id}`,adaptiveIcon:{...expo.android.adaptiveIcon,backgroundColor:retailer.colors.paper}},experiments:{...expo.experiments,baseUrl:`/yourpetcare/home/${retailer.id}`}}:{})};
