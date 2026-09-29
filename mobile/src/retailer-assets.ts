import type {ImageSourcePropType} from 'react-native';
export const retailerLogoSvg:string="";
export const retailerLogoImage:ImageSourcePropType|undefined=require('../assets/retailer/petsonline-logo.png');
export const retailerHero:ImageSourcePropType|undefined=undefined;
export const retailerCompanion:ImageSourcePropType|undefined=undefined;
export const retailerProductImages:Record<string,ImageSourcePropType>={"kennel":require('../assets/retailer/petsonline-kennel.webp'),"litter":require('../assets/retailer/petsonline-litter.webp'),"harness":require('../assets/retailer/petsonline-harness.webp')};
