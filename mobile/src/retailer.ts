import configuration from './retailer.json';
export type RetailerProduct={id:string;name:string;description:string;url:string;kind:'product'|'range'|'guide'};
export type RetailerLink={title:string;url:string};
export const retailer=configuration as {id:string;name:string;tagline:string;website:string;headerBackground:string;headerText:string;accent:string;colors:Record<string,string>;mascotTitle:string;mascotText:string;mascotUrl:string;heroAlt:string;discoveryTitle:string;intro:string;products:RetailerProduct[];links:RetailerLink[]};
export const retailerActive=!!retailer.id;
