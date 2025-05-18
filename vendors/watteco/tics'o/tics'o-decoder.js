function UintToInt(Uint, Size) {
  if (Size === 1) {
    if ((Uint & 0x80) > 0) {
      Uint = Uint - 0x100;
    }
  }
  if (Size === 2) {
    if ((Uint & 0x8000) > 0) {
      Uint = Uint - 0x10000;
    }
  }
  if (Size === 3) {
    if ((Uint & 0x800000) > 0) {
      Uint = Uint - 0x1000000;
    }
  }
  if (Size === 4) {
    if ((Uint & 0x80000000) > 0) {
      Uint = Uint - 0x100000000;
    }
  }


  return Uint;
}

function Bytes2Float32(bytes) {
  var sign = (bytes & 0x80000000) ? -1 : 1;
  var exponent = ((bytes >> 23) & 0xFF) - 127;
  var significand = (bytes & ~(-1 << 23));

  if (exponent == 128) 
      return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);

  if (exponent == -127) {
      if (significand == 0) return sign * 0.0;
      exponent = -126;
      significand /= (1 << 23);
  } else significand = (significand | (1 << 23)) / (1 << 23);

  return sign * significand * Math.pow(2, exponent);
}

// ----------------------------------------------------------------
// ----------------------- FUNCTIONS PART -------------------------
// ----------------------------------------------------------------

/*
* Int conversion directly from buffer with start index and required endianess 
*
* Type must be     : U8,I8,U16,I16,U24,I24,U32,I32,U40,I40,...,U56,I56,I64
* LittleEndian if true either big endian
*/
function BytesToInt64(InBytes, StartIndex, Type,LittleEndian) 
{
  if( typeof(LittleEndian) == 'undefined' ) LittleEndian = false;
  
var Signed  = (Type.substr(0,1) != "U");
var BytesNb = parseInt(Type.substr(1,2), 10)/8;
var inc, start; 
var nb = BytesNb;

if (LittleEndian)
{
  inc = -1; 
  start = StartIndex + BytesNb - 1;
}
else
{
  inc =  1; start = StartIndex ;
}

tmpInt64 = 0;
for (j=start; nb > 0;(j+=inc,nb--)) 
{
  tmpInt64 = (tmpInt64 << 8) + InBytes[j];
}

if ((Signed) && (BytesNb < 8) && (InBytes[start] & 0x80)) 
  tmpInt64 = tmpInt64 - (0x01 << (BytesNb * 8)); 

  return tmpInt64;
}

/*
* Float32 conversion directly from buffer with start index and required endianess 
*
* LittleEndian if true either big endian
*/
function BytesToFloat32(InBytes,StartIndex,LittleEndian) {
  
if( typeof(LittleEndian) == 'undefined' ) LittleEndian = false;

var buf = InBytes.slice(StartIndex,StartIndex+4);
if (! LittleEndian)	buf.reverse();
var f32a = new Float32Array((new Int8Array(buf)).buffer);
return f32a[0];
}


function decimalToHex(d, padding) {
  var hex = Number(d).toString(16).toUpperCase();
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
      hex = "0" + hex;
  }

  return "0x" + hex;
}

function parseHexString(str) { 
  var result = [];
  while (str.length >= 2) { 
      result.push(parseInt(str.substring(0, 2), 16));

      str = str.substring(2, str.length);
  }

  return result;
}

function byteToHex(b) {
var hexChar = ["0", "1", "2", "3", "4", "5", "6", "7","8", "9", "A", "B", "C", "D", "E", "F"];
return hexChar[(b >> 4) & 0x0f] + hexChar[b & 0x0f];
}

function BytesToHexStr(buff) {
var hexOctets = [];
  for (i = 0; i < buff.length; ++i) {
  hexOctets.push( byteToHex(buff[i],2) );
}
  return hexOctets.join("");
}

function zeroPad(num, places) {
return( String(num).padStart(places, '0') );
}



/* 
* ===============================================================================
* TIC specific part
* ===============================================================================
*/


function TIC_Decode(ClusterID,AttributeID,BytesAfterSize)
{
var data = {};
// GENERIC ENUMs Management
//-------------------------
var E_DIV = 
  ["!?!", "*", "", 
  " ACTIF", "ACTIF", "CONSO", "CONTROLE", "DEP", "INACTIF", "PROD", "TEST", "kVA", "kW"];
var E_PT  = 
  ["!?!", "*", "", 
  " ? ", "000", "HC", "HCD", "HCE", "HCH", "HH", "HH ", "HP", "HP ", "HPD", "HPE", "HPH", "JA", "JA ", "P", "P  ", "PM", "PM ", "XXX"];
var E_CONTRAT = 
  ["!?!", "*", "", 
  "BT 4 SUP36", "BT 5 SUP36", "HTA 5     ", "HTA 8     ", 
  "TJ EJP    ", "TJ EJP-HH ", "TJ EJP-PM ", "TJ EJP-SD ", "TJ LU     ", 
  "TJ LU-CH  ", "TJ LU-P   ", "TJ LU-PH  ", "TJ LU-SD  ", "TJ MU     ", 
  "TV A5 BASE", "TV A8 BASE",
  "BASE","H PLEINE-CREUSE","HPHC","HC","HC et Week-End","EJP","PRODUCTEUR"];
var E_STD_PT =
  ["!?!", "*", "", 
   " ? ",
   "000", "HC", "HCD", "HCE", "HCH", "HH", "HH ", "HP", "HP ",
   "HPD", "HPE","HPH", "JA", "JA ",  "P","P  ", "PM",   "PM ", "XXX",
   "INDEX NON CONSO","BASE","HEURE CREUSE","HEURE PLEINE","HEURE NORMALE","HEURE POINTE",
   "HC BLEU","BUHC","HP BLEU","BUHP","HC BLANC","BCHC","HP BLANC","BCHP", "HC ROUGE","RHC","HP ROUGE","RHP", 
   "HEURE WEEK-END" ];
var E_STD_CONTRAT =
  ["!?!", "*", "", 
   "BT 4 SUP36", "BT 5 SUP36", "HTA 5     ", "HTA 8     ",
   "TJ EJP    ", "TJ EJP-HH ", "TJ EJP-PM ", "TJ EJP-SD ", "TJ LU     ",
   "TJ LU-CH  ", "TJ LU-P   ", "TJ LU-PH  ", "TJ LU-SD  ", "TJ MU     ",
   "TV A5 BASE", "TV A8 BASE",
   "BASE","H PLEINE-CREUSE","HPHC","HC","HC et Week-End","EJP","PRODUCTEUR" 
   /* Todo: Add necessary Enums when known */ 
  ];
 
function TICParseEnum(Bytes,i,Enums) {
  var x = {};
  if ((Bytes[i] & 0x80) == 0) { // Really Enum
    iEnum = Bytes[i] & 0x7F;
    
    // Palliatif Anomalie 3.5.0.4852 à 3.5.0.5339 (Cf http://support.nke-watteco.com/tic/)
    // Ligne à commenter si le capteur PMEPMI a une version firmware différente de ci-dessus
    iEnum++;
    
    x = Enums[iEnum]; i+=1;
  } else { // NString
    sz = Bytes[i] & 0x7F; i += 1;
    if (sz > 0) {
      x = String.fromCharCode.apply(null, Bytes.slice(i, i+sz)); i += sz;
    } else {
      x = "";
    }
  }
  return { x: x, i: i };
}

// DESCRIPTOR Parser
//------------------
function TICParseDescToIndexes(DescIn) {
  
  var Indexes = [];
  
  var DescHeader = DescIn[0];
  var DescSize = (DescHeader & 0x1F);
  if (DescSize == 0) {
    DescSize = 8; // Historical fixed size Descriptor
  }
  IsVarIndexes = ((DescHeader & 0x20) != 0);
  
  if (IsVarIndexes) {
    for (i=1; i < DescSize; i++) {
      Indexes.push(DescIn[i]);
    }
  } else {
    // is VarBitfields
    iField = 0;
    // TODO if historical: 7 LSbit of first byte should be used ... TODO
    for (var i=DescSize; i > 1; i--) {
      for (b = 0; b < 8; b++) {
        if ((DescIn[i-1] >> b) & 0x01) {
          Indexes.push(iField);
        }
        iField++;
      }				
    }
  }
  
  return { DescSize : DescSize, Indexes: Indexes };
 }

function TICParseDMYhms(b,i) {
  x = zeroPad(BytesToInt64(b,i,"U8"),2) + "/"+ zeroPad(BytesToInt64(b,i+1,"U8"),2) + "/"+ zeroPad(BytesToInt64(b,i+2,"U8"),2) + " " +
    zeroPad(BytesToInt64(b,i+3,"U8"),2) + ":"+ zeroPad(BytesToInt64(b,i+4,"U8"),2) + ":"+ zeroPad(BytesToInt64(b,i+5,"U8"),2); 
  i+=6;
  return { x: x, i: i };
}

function TICParseTimeStamp(b,i,LittleEndian) {
  // EPOCH TIC: 01/01/2000 00:00:00
  // EPOCH UNIX: 01/01/1970 00:00:00
  ts = BytesToInt64(b,i,"U32",LittleEndian); i += 4;
  ts += (new Date("2000/01/01 00:00:00").getTime()/1000)
  ts += 3600; //TODO: find a way to beter manage this 1h shift due to TZ and DST of running computer
  var a = new Date( ts * 1000);
  var x = 
    zeroPad(a.getDate(),2) + '/' + zeroPad(a.getMonth(), 2) + '/' + a.getFullYear() + ' ' +
    zeroPad(a.getHours(),2) + ':' + zeroPad(a.getMinutes(),2) + ':' + zeroPad(a.getSeconds(),2) ;
  return { x: x, i: i };;
}

function TICParseCString(b,i) {
  eos = b.slice(i).indexOf(0); 
  x = String.fromCharCode.apply(null, b.slice(i, i + eos)); i += (eos + 1);
  return { x: x, i: i };
}	

function TICParseNString(b,i, n) {
  x = String.fromCharCode.apply(null, b.slice(i, i+n)); i+=n;
  return { x: x, i: i };
}


 
// ---------------------------------------------------------
// FIELD PARSING
function TYPE_EMPTY(b,i) { return {b:b,i:i}; }
function TYPE_CHAR(b,i)    { 
  x = String.fromCharCode.apply(null, b.slice(0,1)); i+=1;
  return { x: x, i: i }; 
}
function TYPE_CSTRING(b,i) { return TICParseCString(b,i); } 
function TYPE_U8(b,i)      { x = BytesToInt64(b,i,"U8"); i+=1; return { x: x, i: i }; }
function TYPE_U16(b,i)     { x = BytesToInt64(b,i,"U16"); i+=2; return { x: x, i: i }; }
function TYPE_I16(b,i)     { x = BytesToInt64(b,i,"I16"); i+=2; return { x: x, i: i }; }
function TYPE_U24CSTRING(b,i) {
  var x = {};
  x["Value"] = BytesToInt64(b,i,"U24"); i += 3;
  s = TICParseCString(b,i); 
  x["Label"] = s.x; i = s.i;
  return { x: x, i: i };
};
function TYPE_U24(b,i)     { x = BytesToInt64(b,i,"U24"); i+=3; return { x: x, i: i }; }
function TYPE_4U24(b,i)    {
  var x = {};
  for (i=1;i<=4;i++) { x["Value_"+i] = BytesToInt64(b,i,"U24"); i += 3; }
  return { x: x, i: i };
};
function TYPE_6U24(b,i)    {
  var x = {};
  for (i=1;i<=4;i++) { x["Value_"+i] = BytesToInt64(b,i,"U24"); i += 3; }
  return { x: x, i: i };
}
function TYPE_U32(b,i)     { x = BytesToInt64(b,i,"U32"); i+=4; return { x: x, i: i }; }
function TYPE_FLOAT(b,i)   { x = BytesToFloat32(b,i); i+=4; return { x: x, i: i }; }
function TYPE_DMYhms(b,i)  { return TICParseDMYhms(b,i); }
function TYPE_tsDMYhms(b,i){ return TICParseTimeStamp(b,i); };
function TYPE_DMYhmsCSTRING(b,i) { 
  var x = {};
  var d = TICParseDMYhms(b,i); x["Date"]=d.x; ;
  var s = TICParseCString(b,d.i);x["Label"]=s.x; 
  i = s.i; 
  return { x: x, i: i };;
}
function TYPE_E_PT(b,i)     { return TICParseEnum(b,i,E_PT); }
function TYPE_E_STD_PT(b,i) { return TICParseEnum(b,i,E_STD_PT); }
function TYPE_tsDMYhms_E_PT(b,i) {
  var x = {};
  var d = TICParseTimeStamp(b,i);
  var e = TICParseEnum(b,d.i,E_PT);
  i = e.i;
  return { x: x, i: i };
}
function TYPE_hmDM(b,i) {
  var x = {};
  h = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  m = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  D = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  M = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  x = D + "/" + M + " " + h + ":" + m; 
  return { x: x, i: i };
}
function TYPE_DMh(b,i) {
  var x = {};
  D = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  M = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  h = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  x = D + "/" + M + " " + h ; 
  return { x: x, i: i };
}
function TYPE_hm(b,i) {
  var x = {};
  h = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  m = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
  x = h + ":" + m; 
  return { x: x, i: i };
}
function TYPE_SDMYhms(b,i) {
  var x = {};
  s = TICParseNString(b,i, 1);
  d = TICParseDMYhms(b,s.i); 
  x["S"]=s.x;
  x["Date"]=d.x;
  i=d.i;
  return { x: x, i: i };
}
function TYPE_SDMYhmsU8(b,i) {
  var x = {};
  s = TICParseNString(b,i, 1);
  d = TICParseDMYhms(b,s.i); 
  n = BytesToInt64(b,i,"U8"); i = d.i + 1;
  x["S"]=s.x;
  x["Date"]=d.x;
  x["Value"]=n;
  return { x: x, i: i };
}
function TYPE_SDMYhmsU16(b,i) {
  var x = {};
  s = TICParseNString(b,i, 1);
  d = TICParseDMYhms(b,s.i); 
  n = BytesToInt64(b,i,"U16"); i = d.i + 1;
  x["S"]=s.x;
  x["Date"]=d.x;
  x["Value"]=n;
  return { x: x, i: i };
}
function TYPE_SDMYhmsU24(b,i) {
  var x = {};
  s = TICParseNString(b,i, 1);
  d = TICParseDMYhms(b,s.i); 
  n = BytesToInt64(b,i,"U24"); i = d.i + 1;
  x["S"]=s.x;
  x["Date"]=d.x;
  x["Value"]=n;
  return { x: x, i: i };
}
function TYPE_BF32xbe(b,i) {
  var x = BytesToHexStr(b.slice(i,2)); i+=4;
  i+=4
  return { x: x, i: i };
}   /* Bitfield 32 bits heXa Big Endian */
function TYPE_HEXSTRING(b,i) {
  var x = BytesToHexStr(b.slice(i+1,i+1+b[i]));
  i+=b[i]+1;
  return { x: x, i: i };
}
function TYPE_E_DIV(b,i) { return TICParseEnum(b,i,E_DIV); }
function TYPE_U24_E_DIV(b,i) { 
  var x = {};
  dd = BytesToInt64(b,i,"U24"); i += 3;
  x.Value = dd;
  e = TICParseEnum(b,i,E_DIV); 
  x.Label = e.x; i = e.i;
  return { x: x, i: i };
}
function TYPE_E_CONTRAT(b,i) { return TICParseEnum(b,i,E_CONTRAT); }
function TYPE_E_STD_CONTRAT(b,i) { return TICParseEnum(b,i,E_STD_CONTRAT); }
function TYPE_11hhmmSSSS(b,i) {
  var x = []
  for (var j = 0 ; j < 11; j++) {
    y = {};
    h = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
    if (h == 0xFF) {
      y["Status"] = "NONUTILE"
    } else {
      m = zeroPad(BytesToInt64(b,i,"U8"),2); i++;
      s = BytesToHexStr(b.slice(i,2)); i++;
      y["Time"] = h + ":" + m;
      y["Status"] = s;
      i+=b[i]+1;
    }
    x.push(y);
  }
  return { x: x, i: i };
} /* New type for PJOURF+1 / PPOINTE of Linky. */
           /* 11 Blocs of 8 Bytes (hhmmSSSS) space separated values are compressed as follow */
           /* hh 1 byte Hour, mm 1 byte Minute, SSSS two bytes bitfield */
           /* Notes: */
           /* - Delta comparison: */
           /*   hh and mm are usual for delta comparison */
           /*   SSSS is compared as bitfield each bit set may trig an event if changed */
           /* - An unused field is defined as follow: */
           /*   hh = 0xFF and No other bytes used in the binarized form */
           /*   "NONUTILE" string in the TIC ASCII format */
function TYPE_BF8d(b,i) {
  x = BytesToInt64(b,i,"U8"); i++;
  return { x: x, i: i };
}		/* Bitfield de 8 bit with TIC decimal representation (0 à 255) */

  

// ---------------------------------------------------------
// OUTPUT FORMATS
// TODO ... At the moment format are not used (Cf c language TIC decoder)
function FMT_UNDEF(x) { return(x); };

function FMT_s(x)     { return(x); }; // %s 
function FMT_PREAVIS_PT(x) { return(x); }; // TD-%s 
function FMT_c(x)     { return(x); }; // %c 
function FMT_02X(x)   { return(x); }; // %02x 
function FMT_d(x)     { return(x); }; // %d 
function FMT_ld(x)    { return(x); }; // %ld 

function FMT_02d(x)   { return(x); }; // %02d 
function FMT_03d(x)   { return(x); }; // %03d 
function FMT_05d(x)   { return(x); }; // %05d 
/*
function FMT_07d(x)   { return(x); // %07d
function FMT_09d(x)   { return(x); // %09d
*/
function FMT_05ld(x)  { return(x); }; // %05d
function FMT_06ld(x)  { return(x); }; // %06d
function FMT_07ld(x)  { return(x); }; // %07d
function FMT_09ld(x)  { return(x); }; // %09d

function FMT_d_percent(x) { return(x); }; // %d%%

function FMT_d_s(x)    { return(x); }; //%ds

function FMT_d_kW(x)    { return(x); }; // %dkW
function FMT_d_kvar(x)  { return(x); }; // %dkvar

function FMT_05d_kwh(x) { return(x); }; // %05ldkwh
function FMT_ld_Wh(x)   { return(x); }; // %ldWh
function FMT_05ld_Wh(x) { return(x); }; // 05ldWh
function FMT_05ld_varh(x) { return(x); }; // %05ldvarh
function FMT_ld_varh(x) { return(x); }; // %ldvarh
function FMT_ld_VAh(x)  { return(x); }; // %ldVAh

function FMT_d_V(x)     { return(x); }; // %dV

function FMT_d_kWh(x)   { return(x); }; // %dkWh
function FMT_ld_kWh(x)  { return(x); }; // %07ldkWh
function FMT_d_kvarh(x) { return(x); }; // %dkvarh
function FMT_ld_kvarh(x) { return(x); }; // %07ldkvarh

function FMT_05_2f(x)      { return(x); }; // %05.2f"

// ============================================
// PROFILS DEFINITION
// ============================================

// ClusterID: 0x0053, Attribute ID : 0xii00
//-----------------------------------------
var ICE_General = [
  ["CONTRAT",	TYPE_CSTRING,0,FMT_s],
  ["DATECOUR",TYPE_DMYhms,0,FMT_UNDEF],
  ["DATE",TYPE_DMYhms,0,FMT_UNDEF], 
  ["EA",		TYPE_U24,0,FMT_05ld_Wh],
  ["ERP",		TYPE_U24,0,FMT_05ld_varh],
  ["PTCOUR",	TYPE_CSTRING,0,FMT_s],
  ["PREAVIS",	TYPE_CSTRING,0,FMT_s],
  ["MODE",	TYPE_EMPTY,0,FMT_s],
  // Byte 1
  ["DATEPA1",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA1",		TYPE_U16,0,FMT_d_kW],
  ["DATEPA2",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA2",		TYPE_U16,0,FMT_d_kW],
  ["DATEPA3",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA3",		TYPE_U16,0,FMT_d_kW],
  ["DATEPA4",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA4",		TYPE_U16,0,FMT_d_kW],
  // Byte 2
  ["DATEPA5",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA5",		TYPE_U16,0,FMT_d_kW],
  ["DATEPA6",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA6",		TYPE_U16,0,FMT_d_kW],
  ["*p*",	TYPE_U24,0,FMT_05ld],
  //["*p*",	TYPE_U24,ATTRIBUTE_NOT_MANAGED_FIELD,FMT_05ld],
  ["KDC",		TYPE_U8,0,FMT_d_percent],
  ["KDCD",	TYPE_U8,0,FMT_d_percent],
  ["TGPHI",	TYPE_FLOAT,0,FMT_05_2f], 
  // Byte 3
  ["PSP",		TYPE_U16,0,FMT_d_kW],
  ["PSPM",	TYPE_U16,0,FMT_d_kW],
  ["PSHPH",	TYPE_U16,0,FMT_d_kW],
  ["PSHPD",	TYPE_U16,0,FMT_d_kW],
  ["PSHCH",	TYPE_U16,0,FMT_d_kW],
  ["PSHCD",	TYPE_U16,0,FMT_d_kW],
  ["PSHPE",	TYPE_U16,0,FMT_d_kW],
  ["PSHCE",	TYPE_U16,0,FMT_d_kW],
  // Byte 4
  ["PSJA",	TYPE_U16,0,FMT_d_kW],
  ["PSHH",	TYPE_U16,0,FMT_d_kW],
  ["PSHD",	TYPE_U16,0,FMT_d_kW],
  ["PSHM",	TYPE_U16,0,FMT_d_kW],
  ["PSDSM",	TYPE_U16,0,FMT_d_kW],
  ["PSSCM",	TYPE_U16,0,FMT_d_kW],
  ["MODE",	TYPE_EMPTY,0,FMT_s],
  ["PA1MN",	TYPE_U16,0,FMT_d_kW],
  // Byte 5
  ["PA10MN",	TYPE_U16,0,FMT_d_kW],
  ["PREA1MN",	TYPE_I16,0,FMT_d_kvar],
  ["PREA10MN",TYPE_I16,0,FMT_d_kvar],
  ["TGPHI",	TYPE_FLOAT,0,FMT_05_2f],
  ["U10MN",	TYPE_U16,0,FMT_d_V]
];

// ClusterID: 0x0053, Attribute ID : 0xii01
//-----------------------------------------
var ICE_p = [
  //Byte 0
  ["DEBUTp",	TYPE_DMYhms,0,FMT_UNDEF,0],
  ["FINp",	TYPE_DMYhms,0,FMT_UNDEF,6],
  ["CAFp",	TYPE_U16,0,FMT_05d,12],

  ["DATEEAp",TYPE_DMYhms,0,FMT_UNDEF,14],
  ["EApP",	TYPE_U24,0,FMT_ld_kWh,20],
  ["EApPM",	TYPE_U24,0,FMT_ld_kWh,23],
  ["EApHCE",	TYPE_U24,0,FMT_ld_kWh,26],
  ["EApHCH",	TYPE_U24,0,FMT_ld_kWh,29],
  //Byte 1
  ["EApHH",	TYPE_U24,0,FMT_ld_kWh,32],
  ["EApHCD",	TYPE_U24,0,FMT_ld_kWh,35],
  ["EApHD",	TYPE_U24,0,FMT_ld_kWh,38],
  ["EApJA",	TYPE_U24,0,FMT_ld_kWh,41],
  ["EApHPE",	TYPE_U24,0,FMT_ld_kWh,44],
  ["EApHPH",	TYPE_U24,0,FMT_ld_kWh,47],
  ["EApHPD",	TYPE_U24,0,FMT_ld_kWh,50],
  ["EApSCM",	TYPE_U24,0,FMT_ld_kWh,53],
  // Byte 2
  ["EApHM",	TYPE_U24,0,FMT_ld_kWh,56],
  ["EApDSM",	TYPE_U24,0,FMT_ld_kWh,59],

  ["DATEERPp",TYPE_DMYhms,0,FMT_UNDEF,62],
  ["ERPpP",	TYPE_U24,0,FMT_ld_kvarh,68],
  ["ERPpPM",	TYPE_U24,0,FMT_ld_kvarh,71],
  ["ERPpHCE",	TYPE_U24,0,FMT_ld_kvarh,74],
  ["ERPpHCH",	TYPE_U24,0,FMT_ld_kvarh,77],
  ["ERPpHH",	TYPE_U24,0,FMT_ld_kvarh,80],
  // Byte 3
  ["ERPpHCD",	TYPE_U24,0,FMT_ld_kvarh,83],
  ["ERPpHD",	TYPE_U24,0,FMT_ld_kvarh,86],
  ["ERPpJA",	TYPE_U24,0,FMT_ld_kvarh,89],
  ["ERPpHPE",	TYPE_U24,0,FMT_ld_kvarh,92],
  ["ERPpHPH",	TYPE_U24,0,FMT_ld_kvarh,95],
  ["ERPpHPD",	TYPE_U24,0,FMT_ld_kvarh,98],
  ["ERPpSCM",	TYPE_U24,0,FMT_ld_kvarh,101],
  ["ERPpHM",	TYPE_U24,0,FMT_ld_kvarh,104],
  // Byte 4
  ["ERPpDSM",	TYPE_U24,0,FMT_ld_kvarh,107],

  ["DATEERNp",TYPE_DMYhms,0,FMT_UNDEF,110],
  ["ERNpP",	TYPE_U24,0,FMT_ld_kvarh,116],
  ["ERNpPM",	TYPE_U24,0,FMT_ld_kvarh,119],
  ["ERNpHCE",	TYPE_U24,0,FMT_ld_kvarh,122],
  ["ERNpHCH",	TYPE_U24,0,FMT_ld_kvarh,125],
  ["ERNpHH",	TYPE_U24,0,FMT_ld_kvarh,128],
  ["ERNpHCD",	TYPE_U24,0,FMT_ld_kvarh,131],
  // Byte 5
  ["ERNpHD",	TYPE_U24,0,FMT_ld_kvarh,134],
  ["ERNpJA",	TYPE_U24,0,FMT_ld_kvarh,137],
  ["ERNpHPE",	TYPE_U24,0,FMT_ld_kvarh,140],
  ["ERNpHPH",	TYPE_U24,0,FMT_ld_kvarh,143],
  ["ERNpHPD",	TYPE_U24,0,FMT_ld_kvarh,146],
  ["ERNpSCM",	TYPE_U24,0,FMT_ld_kvarh,149],
  ["ERNpHM",	TYPE_U24,0,FMT_ld_kvarh,152],
  ["ERNpDSM",	TYPE_U24,0,FMT_ld_kvarh,155]
  // Byte 6
];

// ClusterID: 0x0053, Attribute ID : 0xii02
//-----------------------------------------
var ICE_p1 = [
  //Byte 0
  ["DEBUTp1",	TYPE_DMYhms,0,FMT_UNDEF,0],
  ["FINp1",	TYPE_DMYhms,0,FMT_UNDEF,6],
  ["CAFp1",	TYPE_U16,0,FMT_05d,12],

  ["DATEEAp1",TYPE_DMYhms,0,FMT_UNDEF,14],
  ["EAp1P",	TYPE_U24,0,FMT_ld_kWh,20],
  ["EAp1PM",	TYPE_U24,0,FMT_ld_kWh,23],
  ["EAp1HCE",	TYPE_U24,0,FMT_ld_kWh,26],
  ["EAp1HCH",	TYPE_U24,0,FMT_ld_kWh,29],
  //Byte 1
  ["EAp1HH",	TYPE_U24,0,FMT_ld_kWh,32],
  ["EAp1HCD",	TYPE_U24,0,FMT_ld_kWh,35],
  ["EAp1HD",	TYPE_U24,0,FMT_ld_kWh,38],
  ["EAp1JA",	TYPE_U24,0,FMT_ld_kWh,41],
  ["EAp1HPE",	TYPE_U24,0,FMT_ld_kWh,44],
  ["EAp1HPH",	TYPE_U24,0,FMT_ld_kWh,47],
  ["EAp1HPD",	TYPE_U24,0,FMT_ld_kWh,50],
  ["EAp1SCM",	TYPE_U24,0,FMT_ld_kWh,53],
  // Byte 2
  ["EAp1HM",	TYPE_U24,0,FMT_ld_kWh,56],
  ["EAp1DSM",	TYPE_U24,0,FMT_ld_kWh,59],

  ["DATEERPp1",TYPE_DMYhms,0,FMT_UNDEF,62],
  ["ERPp1P",	TYPE_U24,0,FMT_ld_kvarh,68],
  ["ERPp1PM",	TYPE_U24,0,FMT_ld_kvarh,71],
  ["ERPp1HCE",TYPE_U24,0,FMT_ld_kvarh,74],
  ["ERPp1HCH",TYPE_U24,0,FMT_ld_kvarh,77],
  ["ERPp1HH",	TYPE_U24,0,FMT_ld_kvarh,80],
  // Byte 3
  ["ERPp1HCD",TYPE_U24,0,FMT_ld_kvarh,83],
  ["ERPp1HD",	TYPE_U24,0,FMT_ld_kvarh,86],
  ["ERPp1JA",	TYPE_U24,0,FMT_ld_kvarh,89],
  ["ERPp1HPE",TYPE_U24,0,FMT_ld_kvarh,92],
  ["ERPp1HPH",TYPE_U24,0,FMT_ld_kvarh,95],
  ["ERPp1HPD",TYPE_U24,0,FMT_ld_kvarh,98],
  ["ERPp1SCM",TYPE_U24,0,FMT_ld_kvarh,101],
  ["ERPp1HM",	TYPE_U24,0,FMT_ld_kvarh,104],
  // Byte 4
  ["ERPp1DSM",TYPE_U24,0,FMT_ld_kvarh,107],

  ["DATEERNp1",TYPE_DMYhms,0,FMT_UNDEF,110],
  ["ERNp1P",	TYPE_U24,0,FMT_ld_kvarh,116],
  ["ERNp1PM",	TYPE_U24,0,FMT_ld_kvarh,119],
  ["ERNp1HCE",TYPE_U24,0,FMT_ld_kvarh,122],
  ["ERNp1HCH",TYPE_U24,0,FMT_ld_kvarh,125],
  ["ERNp1HH",	TYPE_U24,0,FMT_ld_kvarh,128],
  ["ERNp1HCD",TYPE_U24,0,FMT_ld_kvarh,131],
  // Byte 5
  ["ERNp1HD",	TYPE_U24,0,FMT_ld_kvarh,134],
  ["ERNp1JA",	TYPE_U24,0,FMT_ld_kvarh,137],
  ["ERNp1HPE",TYPE_U24,0,FMT_ld_kvarh,140],
  ["ERNp1HPH",TYPE_U24,0,FMT_ld_kvarh,143],
  ["ERNp1HPD",TYPE_U24,0,FMT_ld_kvarh,146],
  ["ERNp1SCM",TYPE_U24,0,FMT_ld_kvarh,149],
  ["ERNp1HM",	TYPE_U24,0,FMT_ld_kvarh,152],
  ["ERNp1DSM",TYPE_U24,0,FMT_ld_kvarh,155]
  // Byte 6
];


// ClusterID: 0x0054, Attribute ID : 0xii00
//-----------------------------------------
var CBE = [
  // Byte 0
  ["ADIR1",   TYPE_U16,0,FMT_03d],
  ["ADIR2",   TYPE_U16,0,FMT_03d],
  ["ADIR3",   TYPE_U16,0,FMT_03d],
  ["ADCO",    TYPE_CSTRING,0,FMT_s],
  ["OPTARIF", TYPE_CSTRING,0,FMT_s],
  ["ISOUSC",  TYPE_U8,0,FMT_02d],
  ["BASE",    TYPE_U32,0,FMT_09ld],
  ["HCHC",    TYPE_U32,0,FMT_09ld],
  // Byte 1
  ["HCHP",    TYPE_U32,0,FMT_09ld],
  ["EJPHN",   TYPE_U32,0,FMT_09ld],
  ["EJPHPM",	TYPE_U32,0,FMT_09ld],
  ["BBRHCJB",	TYPE_U32,0,FMT_09ld],
  ["BBRHPJB",	TYPE_U32,0,FMT_09ld],
  ["BBRHCJW", TYPE_U32,0,FMT_09ld],
  ["BBRHPJW",	TYPE_U32,0,FMT_09ld],
  ["BBRHCJR", TYPE_U32,0,FMT_09ld],
  // Byte 2
  ["BBRHPJR", TYPE_U32,0,FMT_09ld],
  ["PEJP",    TYPE_U8,0,FMT_02d],
  ["GAZ",    	TYPE_U32,0,FMT_07ld],
  ["AUTRE",   TYPE_U32,0,FMT_07ld],
  ["PTEC",    TYPE_CSTRING,0,FMT_s],
  ["DEMAIN",  TYPE_CSTRING,0,FMT_s],
  ["IINST",   TYPE_U16,0,FMT_03d],
  ["IINST1",  TYPE_U16,0,FMT_03d],
  // Byte 3
  ["IINST2",	TYPE_U16,0,FMT_03d],
  ["IINST3",  TYPE_U16,0,FMT_03d],
  ["ADPS",    TYPE_U16,0,FMT_03d],
  ["IMAX",    TYPE_U16,0,FMT_03d],
  ["IMAX1",   TYPE_U16,0,FMT_03d],
  ["IMAX2",   TYPE_U16,0,FMT_03d],
  ["IMAX3",   TYPE_U16,0,FMT_03d],
  ["PMAX",    TYPE_U32,0,FMT_05ld],
  // Byte 4
  ["PAPP",    TYPE_U32,0,FMT_05ld],
  ["HHPHC",   TYPE_CHAR,0,FMT_c],
  ["MOTDETAT",TYPE_CSTRING,0,FMT_s],
  ["PPOT",    TYPE_U8,0,FMT_02X]	
];


// ClusterID: 0x0055, Attribute ID : 0xii00
//-----------------------------------------
var CJE = [
  // Byte 0
  ["JAUNE",	TYPE_hmDM,0,FMT_UNDEF],		// [hh:mn:jj:mm]:pt:dp:abcde:kp
  ["JAUNE",	TYPE_CSTRING,0,FMT_s],	// pt
  ["JAUNE",	TYPE_CSTRING,0,FMT_s],  // dp
  ["JAUNE",	TYPE_U24,0,FMT_05ld],	// abcde
  ["JAUNE",	TYPE_U8,0,FMT_02d],		// kp
  ["ENERG",	TYPE_6U24,0,FMT_06ld],		// 111111:222222:...:666666
  ["ENERG",	TYPE_U24,0,FMT_06ld],		// 222222
  ["ENERG",	TYPE_U24,0,FMT_06ld],		// 333333
  // Byte 1
  ["ENERG",	TYPE_U24,0,FMT_06ld],		// 444444
  ["ENERG",	TYPE_U24,0,FMT_06ld],		// 555555
  ["ENERG",	TYPE_U24,0,FMT_06ld],		// 666666
  ["PERCC",	TYPE_DMh,0,FMT_UNDEF],		// jj:mm:hh[:cg]
  ["PERCC",	TYPE_U8,0,FMT_02d],		// cg
  ["PMAXC",	TYPE_4U24,0,FMT_05ld],		// 11111:22222:...:44444
  ["PMAXC",	TYPE_U24,0,FMT_05ld],		// 22222
  ["PMAXC",	TYPE_U24,0,FMT_05ld],		// 33333
  // Byte 2
  ["PMAXC",	TYPE_U24,0,FMT_05ld],		// 44444
  ["TDEPA",	TYPE_4U24,0,FMT_05ld],		// 11111:22222:...:44444
  ["TDEPA",	TYPE_U24,0,FMT_05ld],		// 22222
  ["TDEPA",	TYPE_U24,0,FMT_05ld],		// 33333
  ["TDEPA",	TYPE_U24,0,FMT_05ld],		// 44444
  ["PERCP",	TYPE_DMh,0,FMT_UNDEF],		// [jj:mm:hh]:cg
  ["PERCP",	TYPE_U8,0,FMT_02d],		// cg
  ["PMAXP",	TYPE_4U24,0,FMT_05ld],		// 11111:22222:...:44444
  // Byte 3
  ["PMAXP",	TYPE_U24,0,FMT_05ld],		// 22222
  ["PMAXP",	TYPE_U24,0,FMT_05ld],		// 33333
  ["PMAXP",	TYPE_U24,0,FMT_05ld],		// 44444
  ["PSOUSC",	TYPE_4U24,0,FMT_05ld],		// 11111:22222:...:44444
  ["PSOUSC",	TYPE_U24,0,FMT_05ld],		// 22222
  ["PSOUSC",	TYPE_U24,0,FMT_05ld],		// 33333
  ["PSOUSC",	TYPE_U24,0,FMT_05ld],		// 44444
  ["PSOUSP",	TYPE_4U24,0,FMT_05ld],		// 11111:22222:...:44444
  // Byte 4
  ["PSOUSP",	TYPE_U24,0,FMT_05ld],		// 22222
  ["PSOUSP",	TYPE_U24,0,FMT_05ld],		// 33333
  ["PSOUSP",	TYPE_U24,0,FMT_05ld],		// 44444
  ["FCOU",	TYPE_hm,0,FMT_UNDEF],		// [hh:mn]:dd
  ["FCOU",	TYPE_U8,0,FMT_02d]		// dd
];


// ClusterID: 0x0056, Attribute ID : 0xii00
//-----------------------------------------
var STD = [
  // Byte 0
  ["ADSC",    TYPE_CSTRING,0,FMT_s],
  ["VTIC",    TYPE_U8,0,FMT_02d],
  ["DATE",    TYPE_SDMYhms,0,FMT_UNDEF],
  ["NGTF",    TYPE_E_STD_CONTRAT,0,FMT_s],
  ["LTARF",   TYPE_E_STD_PT,0,FMT_s],
  ["EAST",    TYPE_U32,0,FMT_09ld],
  ["EASF01",  TYPE_U32,0,FMT_09ld],
  ["EASF02",  TYPE_U32,0,FMT_09ld],
  // Byte 1
  ["EASF03",  TYPE_U32,0,FMT_09ld],
  ["EASF04",  TYPE_U32,0,FMT_09ld],
  ["EASF05",  TYPE_U32,0,FMT_09ld],
  ["EASF06",  TYPE_U32,0,FMT_09ld],
  ["EASF07",  TYPE_U32,0,FMT_09ld],
  ["EASF08",  TYPE_U32,0,FMT_09ld],
  ["EASF09",  TYPE_U32,0,FMT_09ld],
  ["EASF10",  TYPE_U32,0,FMT_09ld],
  // Byte 2
  ["EASD01",  TYPE_U32,0,FMT_09ld],
  ["EASD02",  TYPE_U32,0,FMT_09ld],
  ["EASD03",  TYPE_U32,0,FMT_09ld],
  ["EASD04",  TYPE_U32,0,FMT_09ld],
  ["EAIT",    TYPE_U32,0,FMT_09ld],
  ["ERQ1",    TYPE_U32,0,FMT_09ld],
  ["ERQ2",    TYPE_U32,0,FMT_09ld],
  ["ERQ3",    TYPE_U32,0,FMT_09ld],
  // Byte 3
  ["ERQ4",    TYPE_U32,0,FMT_09ld],
  ["IRMS1",   TYPE_U16,0,FMT_03d],
  ["IRMS2",   TYPE_U16,0,FMT_03d],
  ["IRMS3",   TYPE_U16,0,FMT_03d],
  ["URMS1",   TYPE_U16,0,FMT_03d],
  ["URMS2",   TYPE_U16,0,FMT_03d],
  ["URMS3",   TYPE_U16,0,FMT_03d],
  ["PREF",    TYPE_U8,0,FMT_02d],
  // Byte 4
  ["PCOUP",   TYPE_U8,0,FMT_02d],
  ["SINSTS",  TYPE_U24,0,FMT_05ld],
  ["SINSTS1", TYPE_U24,0,FMT_05ld],
  ["SINSTS2", TYPE_U24,0,FMT_05ld],
  ["SINSTS3", TYPE_U24,0,FMT_05ld],
  ["SMAXSN",   TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXSN1",  TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXSN2",  TYPE_SDMYhmsU24,0,FMT_05ld],
  // Byte 5
  ["SMAXSN3",  TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXSN?1", TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXSN1?1",TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXSN2?1",TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXSN3?1",TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SINSTI",  TYPE_U24,0,FMT_05ld],
  ["SMAXIN",  TYPE_SDMYhmsU24,0,FMT_05ld],
  ["SMAXIN-1",TYPE_SDMYhmsU24,0,FMT_05ld],
  // Byte 6
  ["CCASN",   TYPE_SDMYhmsU24,0,FMT_05ld],
  ["CCASN?1", TYPE_SDMYhmsU24,0,FMT_05ld], 
  ["CCAIN",   TYPE_SDMYhmsU24,0,FMT_05ld],
  ["CCAIN?1", TYPE_SDMYhmsU24,0,FMT_05ld], 
  ["UMOY1",   TYPE_SDMYhmsU16,0,FMT_03d],
  ["UMOY2",   TYPE_SDMYhmsU16,0,FMT_03d],
  ["UMOY3",   TYPE_SDMYhmsU16,0,FMT_03d],
  ["STGE",    TYPE_BF32xbe,0,FMT_UNDEF],
  // Byte 7
  ["DPM1",    TYPE_SDMYhmsU8,0,FMT_02d],
  ["FPM1",    TYPE_SDMYhmsU8,0,FMT_02d],
  ["DPM2",    TYPE_SDMYhmsU8,0,FMT_02d],
  ["FPM2",    TYPE_SDMYhmsU8,0,FMT_02d],
  ["DPM3",    TYPE_SDMYhmsU8,0,FMT_02d],
  ["FPM3",    TYPE_SDMYhmsU8,0,FMT_02d],
  ["MSG1",    TYPE_CSTRING,0,FMT_s],
  ["MSG2",    TYPE_CSTRING,0,FMT_s],
  // Byte 8
  ["PRM",     TYPE_CSTRING,0,FMT_s ],
  ["RELAIS",  TYPE_BF8d,0,FMT_03d ],
  ["NTARF",   TYPE_U8,0,FMT_02d ],
  ["NJOURF",  TYPE_U8,0,FMT_02d ],
  ["NJOURF+1",TYPE_U8,0,FMT_02d ],
  ["PJOURF+1",TYPE_11hhmmSSSS,0,FMT_UNDEF ],
  ["PPOINTE", TYPE_11hhmmSSSS,0,FMT_UNDEF ]
];

// ClusterID: 0x0057, Attribute ID : 0xii00
//-----------------------------------------
var PMEPMI = [
  //Byte 0
  ["TRAME",   TYPE_E_DIV,0,FMT_s], /* Uniquement Palier 2013 */
  ["ADS",     TYPE_HEXSTRING,0,FMT_UNDEF], /* Uniquement Palier 2013 */
  ["MESURES1",TYPE_E_CONTRAT,0,FMT_s],
  ["DATE",    TYPE_DMYhms,0,FMT_UNDEF],
  ["EA_s",	TYPE_U24,0,FMT_ld_Wh],
  ["ER+_s",	TYPE_U24,0,FMT_ld_varh],
  ["ER-_s",   TYPE_U24,0,FMT_ld_varh],
  ["EAPP_s",	TYPE_U24,0,FMT_ld_VAh],
  //Byte 1
  ["EA_i",    TYPE_U24,0,FMT_ld_Wh],
  ["ER+_i",   TYPE_U24,0,FMT_ld_varh],
  ["ER-_i",   TYPE_U24,0,FMT_ld_varh],
  ["EAPP_i",	TYPE_U24,0,FMT_ld_VAh],
  ["PTCOUR1", TYPE_E_PT,0,FMT_s],
  ["TARIFDYN",TYPE_E_DIV,0,FMT_s],
  ["ETATDYN1",TYPE_E_PT,0,FMT_s],
  ["PREAVIS1",TYPE_E_PT,0,FMT_PREAVIS_PT],
  //Byte 2
  ["TDYN1CD", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["TDYN1CF", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["TDYN1FD", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["TDYN1FF", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["MODE",	TYPE_E_DIV,0,FMT_s],
  ["CONFIG",	TYPE_E_DIV,0,FMT_s],
  ["DATEPA1",	TYPE_DMYhms,0,FMT_UNDEF],
  ["PA1_s",	TYPE_U16,0,FMT_d_kW],
  // Byte 3
  ["PA1_i",	TYPE_U16,0,FMT_d_kW],
  ["DATEPA2",	TYPE_tsDMYhms,0,FMT_UNDEF],
  ["PA2_s",	TYPE_U16,0,FMT_d_kW],
  ["PA2_i",	TYPE_U16,0,FMT_d_kW],
  ["DATEPA3",	TYPE_tsDMYhms,0,FMT_UNDEF],
  ["PA3_s",	TYPE_U16,0,FMT_d_kW],
  ["PA3_i",	TYPE_U16,0,FMT_d_kW],
  ["DATEPA4",	TYPE_tsDMYhms,0,FMT_UNDEF],
  //Byte 4
  ["PA4_s",	TYPE_U16,0,FMT_d_kW],
  ["PA4_i",	TYPE_U16,0,FMT_d_kW],
  ["DATEPA5",	TYPE_tsDMYhms,0,FMT_UNDEF],
  ["PA5_s",	TYPE_U16,0,FMT_d_kW],
  ["PA5_i",	TYPE_U16,0,FMT_d_kW],
  ["DATEPA6",	TYPE_tsDMYhms,0,FMT_UNDEF],
  ["PA6_s",	TYPE_U16,0,FMT_d_kW],
  ["PA6_i",	TYPE_U16,0,FMT_d_kW],
  //Byte 5
  ["DebP",    TYPE_tsDMYhms,0,FMT_UNDEF],
  ["EAP_s",	TYPE_U24,0,FMT_d_kWh],
  ["EAP_i",  	TYPE_U24,0,FMT_d_kWh],
  ["ER+P_s",  TYPE_U24,0,FMT_d_kvarh],
  ["ER-P_s",  TYPE_U24,0,FMT_d_kvarh],
  ["ER+P_i",  TYPE_U24,0,FMT_d_kvarh],
  ["ER-P_i",  TYPE_U24,0,FMT_d_kvarh],
  ["DebP-1",  TYPE_tsDMYhms,0,FMT_UNDEF],
  //Byte 6
  ["FinP-1",  TYPE_tsDMYhms,0,FMT_UNDEF],
  ["EaP-1_s",	TYPE_U24,0,FMT_d_kWh], 
  ["EaP-1_i",	TYPE_U24,0,FMT_d_kWh], 
  ["ER+P-1_s",TYPE_U24,0,FMT_d_kvarh],
  ["ER-P-1_s",TYPE_U24,0,FMT_d_kvarh],
  ["ER+P-1_i",TYPE_U24,0,FMT_d_kvarh],
  ["ER-P-1_i",TYPE_U24,0,FMT_d_kvarh],
  ["PS",	    TYPE_U24_E_DIV,0,FMT_UNDEF],
  //Byte 7
  ["PREAVIS", TYPE_E_DIV,0,FMT_s],
  ["PA1MN",   TYPE_U16,0,FMT_d_kW],
  ["PMAX_s",	TYPE_U24_E_DIV,0,FMT_UNDEF],
  ["PMAX_i",	TYPE_U24_E_DIV,0,FMT_UNDEF],
  ["TGPHI_s",	TYPE_FLOAT,0,FMT_05_2f],
  ["TGPHI_i",	TYPE_FLOAT,0,FMT_05_2f],
  ["MESURES2",TYPE_E_CONTRAT,0,FMT_s],
  ["PTCOUR2",	TYPE_E_PT,0,FMT_s],
  //Byte 8
  ["ETATDYN2",TYPE_E_PT,0,FMT_s],
  ["PREAVIS2",TYPE_E_PT,0,FMT_PREAVIS_PT],
  ["TDYN2CD", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["TDYN2CF", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["TDYN2FD", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["TDYN2FF", TYPE_tsDMYhms_E_PT,0,FMT_UNDEF],
  ["DebP_2",  TYPE_tsDMYhms,0,FMT_UNDEF],
  ["EaP_s2",	TYPE_U24,0,FMT_d_kWh], 
  //Byte 9
  ["DebP-1_2",TYPE_tsDMYhms,0,FMT_UNDEF],
  ["FinP-1_2",TYPE_tsDMYhms,0,FMT_UNDEF],
  ["EaP-1_s2",TYPE_U24,0,FMT_d_kWh],
  ["_DDMES1_",TYPE_U24,0,FMT_d_s]
];


// ============================================
// ============================================
// DECODING PART
// ============================================
// ============================================

// Init object container for decoded fields 
data = []

// Select PROFIL according to cluster/attribute
if (ClusterID == 0x0053) {
  if (attributeID & 0x00FF == 0)	{
    profil = ICE_General;
    data["_TICFrameType"]="ICE Generale";
  } else if (attributeID & 0x00FF == 1)	{
    profil = ICE_p;
    data["_TICFrameType"]="ICE Periode P";
  } else if (attributeID & 0x0001 == 2)	{
    profil = ICE_p1;
    data["_TICFrameType"]="ICE Periode P moins 1";
  } else {
    return data;
  }
} else if (ClusterID == 0x0054) {
  profil = CBE;
  data["_TICFrameType"]="CBE/Historique";
} else if (ClusterID == 0x0055) {
  profil = CJE;
  data["_TICFrameType"]="CJE";
} else if (ClusterID == 0x0056) {
  profil = STD;
  data["_TICFrameType"]="Standard";
} else if (ClusterID == 0x0057) {
  profil = PMEPMI;
  data["_TICFrameType"]="PMEPMI";
} else {
  return data;
  data["_TICFrameType"]="Unexpected";
}

// Start Decoding descriptor
  var result = TICParseDescToIndexes(BytesAfterSize);
  var DescSize = result.DescSize;
  var Indexes = result.Indexes;

var DescBytes = BytesAfterSize.slice(0,DescSize);
var x = {}
if ((DescBytes[0] & 0x80) == 0x80) {
  x.Obsolete = true;
}
x.Bytes = BytesToHexStr(DescBytes);
x.Indexes = Indexes;
data["_Descriptor"]= x;

// Start effective fields decodings
var bytesIndex = DescSize;
for (var j=0; j<Indexes.length; j++) {
  fieldIndex = Indexes[j];
  d = profil[fieldIndex][1](BytesAfterSize,bytesIndex);
  data[profil[fieldIndex][0]] = profil[fieldIndex][3](d.x); 
  bytesIndex=d.i;
}

return data;
}


/* 
* ===============================================================================
* Main decoding function
* ===============================================================================
*/
function Decode(fport, bytes) {
  // Decode an uplink message from a buffer
  // (array) of bytes to an object of fields.
  var decoded = {};
  decoded.lora = {};

  decoded.lora.fport = fport;

  // Get raw payload
  var bytes_len_ = bytes.length;
  var temp_hex_str = "";

  decoded.lora.payload = "";

  for (var j = 0; j < bytes_len_; j++) {
    temp_hex_str = bytes[j].toString(16).toUpperCase();
    if (temp_hex_str.length == 1) {
      temp_hex_str = "0" + temp_hex_str;
    }
    decoded.lora.payload += temp_hex_str;
    var date = new Date();
    decoded.lora.date = date.toISOString();
  }

  if (fport === 125) {
    //batch
    batch = !(bytes[0] & 0x01);

    //trame standard
    if (batch === false) {
      decoded.zclheader = {};
      decoded.zclheader.report = "standard";
      attributID = -1;
      cmdID = -1;
      clusterdID = -1;
      //endpoint
      decoded.zclheader.endpoint = ((bytes[0] & 0xE0) >> 5) | ((bytes[0] & 0x06) << 2);
      //command ID
      cmdID = bytes[1];
      decoded.zclheader.cmdID = decimalToHex(cmdID, 2);
      //Cluster ID
      clusterdID = bytes[2] * 256 + bytes[3];
      decoded.zclheader.clusterdID = decimalToHex(clusterdID, 4);

      // decode report and read atrtribut response
      if ((cmdID === 0x0a) | (cmdID === 0x8a) | (cmdID === 0x01)) {
        //Attribut ID
        attributID = bytes[4] * 256 + bytes[5];
        decoded.zclheader.attributID = decimalToHex(attributID, 4);

        if (cmdID === 0x8a) decoded.zclheader.alarm = 1;
        //data index start
        if ((cmdID === 0x0a) | (cmdID === 0x8a)) {
          decoded.zclheader.attribut_type = bytes[6];
          index = 7;
        }
        if (cmdID === 0x01) {
          decoded.zclheader.status = bytes[6];
          decoded.zclheader.attribut_type = bytes[7];
          index = 8;
        }

        //temperature
        if ((clusterdID === 0x0402) & (attributID === 0x0000))
          decoded.temperature = (UintToInt(bytes[index] * 256 + bytes[index + 1], 2)) / 100;
        //humidity
        if ((clusterdID === 0x0405) & (attributID === 0x0000))
          decoded.humidity = (bytes[index] * 256 + bytes[index + 1]) / 100;
        //binary input counter
        if ((clusterdID === 0x000f) & (attributID === 0x0402))
          decoded.counter =
            bytes[index] * 256 * 256 * 256 +
            bytes[index + 1] * 256 * 256 +
            bytes[index + 2] * 256 +
            bytes[index + 3];
        // binary input present value
        if ((clusterdID === 0x000f) & (attributID === 0x0055))
          decoded.pin_state = !(!bytes[index]);
        //multistate output
        if ((clusterdID === 0x0013) & (attributID === 0x0055))
          decoded.value = bytes[index];
        // on/off present value
        if ((clusterdID === 0x0006) & (attributID === 0x0000)) {
          state = bytes[index];
          if (state === 1) decoded.state = "ON";
          else decoded.state = "OFF";
        }
        //differential pressure
        if ((clusterdID === 0x8008) & (attributID === 0x0000))
          decoded.differential_pressure = bytes[index] * 256 + bytes[index + 1];
        // multibinary input present value
        if ((clusterdID === 0x8005) & (attributID === 0x0000)) {
          decoded.pin_state_1 = (bytes[index + 1] & 0x01) === 0x01;
          decoded.pin_state_2 = (bytes[index + 1] & 0x02) === 0x02;
          decoded.pin_state_3 = (bytes[index + 1] & 0x04) === 0x04;
          decoded.pin_state_4 = (bytes[index + 1] & 0x08) === 0x08;
          decoded.pin_state_5 = (bytes[index + 1] & 0x10) === 0x10;
          decoded.pin_state_6 = (bytes[index + 1] & 0x20) === 0x20;
          decoded.pin_state_7 = (bytes[index + 1] & 0x40) === 0x40;
          decoded.pin_state_8 = (bytes[index + 1] & 0x80) === 0x80;
          decoded.pin_state_9 = (bytes[index] & 0x01) === 0x01;
          decoded.pin_state_10 = (bytes[index] & 0x02) === 0x02;
        }
        // Number
        if ((clusterdID === 0x800E) & (attributID === 0x0000)) {
          switch (decoded.zclheader.attribut_type) {
            // UInt 8/16/24/32
            case 0x20:
              decoded.UInt8 = bytes[index];
              break;
            case 0x21:
              decoded.UInt16 = bytes[index] * 256 + bytes[index + 1];
              break;
            case 0x22:
              decoded.UInt24 =
                bytes[index] * 256 * 256 + bytes[index + 1] * 256 + bytes[index + 2];
              break;
            case 0x23:
              decoded.UInt32 =
                bytes[index] * 256 * 256 * 256 +
                bytes[index + 1] * 256 * 256 +
                bytes[index + 2] * 256 +
                bytes[index + 3];
              break;

            // Int 8/16/24/32
            case 0x28:
              decoded.UInt8 = UintToInt(bytes[index], 1);
              break;
            case 0x29:
              decoded.UInt16 = UintToInt(bytes[index] * 256 + bytes[index + 1], 2);
              break;
            case 0x2a:
              decoded.UInt24 = UintToInt(
                bytes[index] * 256 * 256 + bytes[index + 1] * 256 + bytes[index + 2],
                3
              );
              break;
            case 0x2b:
              decoded.UInt32 = UintToInt(
                bytes[index] * 256 * 256 * 256 +
                  bytes[index + 1] * 256 * 256 +
                  bytes[index + 2] * 256 +
                  bytes[index + 3],
                4
              );
              break;

            // Float
            case 0x39:
              decoded.Float = Bytes2Float32(
                bytes[index] * 256 * 256 * 256 +
                  bytes[index + 1] * 256 * 256 +
                  bytes[index + 2] * 256 +
                  bytes[index + 3]
              );
              break;

            default:
              decoded.value = NaN;
          }
        }
        //analog input
        if (clusterdID === 0x000c) {
          if (attributID === 0x0055) {
            decoded.analog = Bytes2Float32(
              bytes[index] * 256 * 256 * 256 +
                bytes[index + 1] * 256 * 256 +
                bytes[index + 2] * 256 +
                bytes[index + 3]
            );
          }
          if (attributID === 0x8003) {
            decoded.power_duration = bytes[index] * 256 + bytes[index + 1];
          }
          if (attributID === 0x8004) {
            o = (decoded.chock_parameters = {});

            tmp = (bytes[index] & 0xc0) >> 6;
            o.mode = tmp == 0 ? "Idle" : tmp == 1 ? "Chock" : tmp == 2 ? "Click" : "Undef";

            tmp = (bytes[index] & 0x3c) >> 2;
            freqs = [0, 1, 10, 25, 50, 100, 200, 400, 1620, 5376];
            o.sampling_frequency_hz = freqs[tmp];

            tmp = bytes[index] & 0x03;
            range_lbl = ["+/-2g", "+/-4g", "+/-8g", "+/-16g"];
            resol = [16, 32, 62, 186];
            o.range = range_lbl[tmp];

            tmp2 = bytes[index + 1] & 0x7f;
            o.threshold_mg = tmp2 * resol[tmp];
          }
        }

        //modbus
        if ((clusterdID === 0x8007) & (attributID === 0x0001)) {
          decoded.payload = "";
          decoded.modbus_payload = "";
          decoded.size = bytes[index];
          decoded.modbus_float = 0; // 0: pas de décodage float 1: décodage float 2: décodage float 2word inversé
          for (var j = 0; j < decoded.size; j++) {
            temp_hex_str = bytes[index + j + 1].toString(16).toUpperCase();
            if (temp_hex_str.length == 1) {
              temp_hex_str = "0" + temp_hex_str;
            }
            decoded.payload += temp_hex_str;

            if (j == 0) {
              decoded.modbus_address = bytes[index + j + 1];
            } else if (j == 1) {
              decoded.modbus_commandID = bytes[index + j + 1];
            } else if (j == 2) {
              decoded.modbus_size = bytes[index + j + 1];
            } else {
              decoded.modbus_payload += temp_hex_str;
              if (decoded.modbus_float == 1) {
                // big endian
                if (j == 3)
                  decoded.fregister_00 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 7)
                  decoded.fregister_01 = Bytes2Float32(
                    bytes[index + j + 1] * 256 *  ensk * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 11)
                  decoded.fregister_02 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 15)
                  decoded.fregister_03 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 19)
                  decoded.fregister_04 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 23)
                  decoded.fregister_05 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 27)
                  decoded.fregister_06 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 31)
                  decoded.fregister_07 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 35)
                  decoded.fregister_08 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
                if (j == 35)
                  decoded.fregister_09 = Bytes2Float32(
                    bytes[index + j + 1] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 1] * 256 * 256 +
                      bytes[index + j + 1 + 2] * 256 +
                      bytes[index + j + 1 + 3]
                  );
              }
              if (decoded.modbus_float == 2) {
                // float little endian 2 word
                if (j == 3)
                  decoded.fregister_00 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 7)
                  decoded.fregister_01 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 11)
                  decoded.fregister_02 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 15)
                  decoded.fregister_03 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 19)
                  decoded.fregister_04 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 23)
                  decoded.fregister_05 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 27)
                  decoded.fregister_06 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 31)
                  decoded.fregister_07 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 35)
                  decoded.fregister_08 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
                if (j == 35)
                  decoded.fregister_09 = Bytes2Float32(
                    bytes[index + j + 1] * 256 +
                      bytes[index + j + 1 + 1] +
                      bytes[index + j + 1 + 2] * 256 * 256 * 256 +
                      bytes[index + j + 1 + 3] * 256 * 256
                  );
              }
            }
          }
        }

        //multimodbus
        if ((clusterdID === 0x8009) & (attributID === 0x0000)) {
          decoded.payloads = "";
          decoded.size = bytes[index];
          decoded.multimodbus_frame_series_sent = bytes[index + 1];
          decoded.multimodbus_frame_number_in_serie = (bytes[index + 2] & 0xe0) >> 5;
          decoded.multimodbus_last_frame_of_serie = (bytes[index + 2] & 0x1c) >> 2;
          decoded.multimodbus_EP9 = (bytes[index + 2] & 0x01) === 0x01;
          decoded.multimodbus_EP8 = (bytes[index + 2] & 0x02) === 0x02;
          decoded.multimodbus_EP7 = (bytes[index + 3] & 0x80) === 0x80;
          decoded.multimodbus_EP6 = (bytes[index + 3] & 0x40) === 0x40;
          decoded.multimodbus_EP5 = (bytes[index + 3] & 0x20) === 0x20;
          decoded.multimodbus_EP4 = (bytes[index + 3] & 0x10) === 0x10;
          decoded.multimodbus_EP3 = (bytes[index + 3] & 0x08) === 0x08;
          decoded.multimodbus_EP2 = (bytes[index + 3] & 0x04) === 0x04;
          decoded.multimodbus_EP1 = (bytes[index + 3] & 0x02) === 0x02;
          decoded.multimodbus_EP0 = (bytes[index + 3] & 0x01) === 0x01;
          index2 = index + 4;
          without_header = 0;

          if (decoded.multimodbus_EP0 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP0_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP0_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP0_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP0_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP0_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP0_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP0_datasize;
          }

          if (decoded.multimodbus_EP1 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP1_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP1_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP1_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP1_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP1_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP1_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP1_datasize;
          }
          if (decoded.multimodbus_EP2 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP2_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP2_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP2_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP2_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP2_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP2_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP2_datasize;
          }
          if (decoded.multimodbus_EP3 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP3_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP3_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP3_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP3_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP3_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP3_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP3_datasize;
          }
          if (decoded.multimodbus_EP4 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP4_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP4_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP4_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP4_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP4_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP4_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP4_datasize;
          }
          if (decoded.multimodbus_EP5 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP5_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP5_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP5_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP5_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP5_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP5_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP5_datasize;
          }
          if (decoded.multimodbus_EP6 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP6_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP6_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP6_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP6_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP6_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP6_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP6_datasize;
          }
          if (decoded.multimodbus_EP7 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP7_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP7_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP7_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP7_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP7_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP7_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP7_datasize;
          }
          if (decoded.multimodbus_EP8 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP8_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP8_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP8_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP8_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP8_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP8_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP8_datasize;
          }
          if (decoded.multimodbus_EP9 === true) {
            if (without_header === 0) {
              decoded.multimodbus_EP6_slaveID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP6_fnctID = bytes[index2];
              index2 = index2 + 1;
              decoded.multimodbus_EP6_datasize = bytes[index2];
              index2 = index2 + 1;
            }
            decoded.multimodbus_EP6_payload = "";
            if (bytes[index2] === undefined) return decoded;
            for (var j = 0; j < decoded.multimodbus_EP6_datasize; j++) {
              temp_hex_str = bytes[index2 + j].toString(16).toUpperCase();
              if (temp_hex_str.length == 1) {
                temp_hex_str = "0" + temp_hex_str;
              }
              decoded.multimodbus_EP6_payload += temp_hex_str;
            }
            index2 = index2 + decoded.multimodbus_EP6_datasize;
          }
        }

        //simple metering
        if ((clusterdID === 0x0052) & (attributID === 0x0000)) {
          decoded.active_energy_Wh = UintToInt(
            bytes[index + 1] * 256 * 256 + bytes[index + 2] * 256 + bytes[index + 3],
            3
          );
          decoded.reactive_energy_Varh = UintToInt(
            bytes[index + 4] * 256 * 256 + bytes[index + 5] * 256 + bytes[index + 6],
            3
          );
          decoded.nb_samples = bytes[index + 7] * 256 + bytes[index + 8];
          decoded.active_power_W = UintToInt(
            bytes[index + 9] * 256 + bytes[index + 10],
            2
          );
          decoded.reactive_power_VAR = UintToInt(
            bytes[index + 11] * 256 + bytes[index + 12],
            2
          );
        }
        // TIC: "TELE INFORMATION CLIENT"
        if (
          clusterdID === 0x0053 ||
          clusterdID === 0x0054 ||
          clusterdID === 0x0055 ||
          clusterdID === 0x0056 ||
          clusterdID === 0x0057
        ) {
          var ticData = TIC_Decode(clusterdID, attributID, bytes.slice(index + 1));
          for (var key in ticData) {
            if (ticData.hasOwnProperty(key)) {
              decoded[key] = ticData[key];
            }
          }
        }
        // lorawan message type
        if ((clusterdID === 0x8004) & (attributID === 0x0000)) {
          if (bytes[index] === 1) decoded.message_type = "confirmed";
          if (bytes[index] === 0) decoded.message_type = "unconfirmed";
        }

        // lorawan retry
        if ((clusterdID === 0x8004) & (attributID === 0x0001)) {
          decoded.nb_retry = bytes[index];
        }

        // lorawan reassociation
        if ((clusterdID === 0x8004) & (attributID === 0x0002)) {
          decoded.period_in_minutes = bytes[index + 1] * 256 + bytes[index + 2];
          decoded.nb_err_frames = bytes[index + 3] * 256 + bytes[index + 4];
        }
        // configuration node power desc
        if ((clusterdID === 0x0050) & (attributID === 0x0006)) {
          index2 = index + 3;
          if ((bytes[index + 2] & 0x01) === 0x01) {
            decoded.main_or_external_voltage =
              (bytes[index2] * 256 + bytes[index2 + 1]) / 1000;
            index2 = index2 + 2;
          }
          if ((bytes[index + 2] & 0x02) === 0x02) {
            decoded.rechargeable_battery_voltage =
              (bytes[index2] * 256 + bytes[index2 + 1]) / 1000;
            index2 = index2 + 2;
          }
          if ((bytes[index + 2] & 0x04) === 0x04) {
            decoded.disposable_battery_voltage =
              (bytes[index2] * 256 + bytes[index2 + 1]) / 1000;
            index2 = index2 + 2;
          }
          if ((bytes[index + 2] & 0x08) === 0x08) {
            decoded.solar_harvesting_voltage =
              (bytes[index2] * 256 + bytes[index2 + 1]) / 1000;
            index2 = index2 + 2;
          }
          if ((bytes[index + 2] & 0x10) === 0x10) {
            decoded.tic_harvesting_voltage =
              (bytes[index2] * 256 + bytes[index2 + 1]) / 1000;
            index2 = index2 + 2;
          }
        }
        //energy and power metering
        if ((clusterdID === 0x800a) & (attributID === 0x0000)) {
          index2 = index;
          decoded.sum_positive_active_energy_Wh = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.sum_negative_active_energy_Wh = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.sum_positive_reactive_energy_Wh = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.sum_negative_reactive_energy_Wh = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.positive_active_power_W = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.negative_active_power_W = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.positive_reactive_power_W = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
          index2 = index2 + 4;
          decoded.negative_reactive_power_W = UintToInt(
            bytes[index2 + 1] * 256 * 256 * 256 +
              bytes[index2 + 2] * 256 * 256 +
              bytes[index2 + 3] * 256 +
              bytes[index2 + 4],
            4
          );
        }

        //energy and power multi metering
        if ((clusterdID === 0x8010) & (attributID === 0x0000)) {
          decoded.ActiveEnergyWhPhaseA = Int32UnsignedToSigned(
            bytes[index + 1] * 256 * 256 * 256 +
              bytes[index + 2] * 256 * 256 +
              bytes[index + 3] * 256 +
              bytes[index + 4]
          );
          decoded.ReactiveEnergyWhPhaseA = Int32UnsignedToSigned(
            bytes[index + 5] * 256 * 256 * 256 +
              bytes[index + 6] * 256 * 256 +
              bytes[index + 7] * 256 +
              bytes[index + 8]
          );
          decoded.ActiveEnergyWhPhaseB = Int32UnsignedToSigned(
            bytes[index + 9] * 256 * 256 * 256 +
              bytes[index + 10] * 256 * 256 +
              bytes[index + 11] * 256 +
              bytes[index + 12]
          );
          decoded.ReactiveEnergyWhPhaseB = Int32UnsignedToSigned(
            bytes[index + 13] * 256 * 256 * 256 +
              bytes[index + 14] * 256 * 256 +
              bytes[index + 15] * 256 +
              bytes[index + 16]
          );
          decoded.ActiveEnergyWhPhaseC = Int32UnsignedToSigned(
            bytes[index + 17] * 256 * 256 * 256 +
              bytes[index + 18] * 256 * 256 +
              bytes[index + 19] * 256 +
              bytes[index + 20]
          );
          decoded.ReactiveEnergyWhPhaseC = Int32UnsignedToSigned(
            bytes[index + 21] * 256 * 256 * 256 +
              bytes[index + 22] * 256 * 256 +
              bytes[index + 23] * 256 +
              bytes[index + 24]
          );
          decoded.ActiveEnergyWhPhaseABC = Int32UnsignedToSigned(
            bytes[index + 25] * 256 * 256 * 256 +
              bytes[index + 26] * 256 * 256 +
              bytes[index + 27] * 256 +
              bytes[index + 28]
          );
          decoded.ReactiveEnergyWhPhaseABC = Int32UnsignedToSigned(
            bytes[index + 29] * 256 * 256 * 256 +
              bytes[index + 30] * 256 * 256 +
              bytes[index + 31] * 256 +
              bytes[index + 32]
          );
        } else if ((clusterdID === 0x8010) & (attributID === 0x0001)) {
          decoded.ActivePowerWPhaseA = Int32UnsignedToSigned(
            bytes[index + 1] * 256 * 256 * 256 +
              bytes[index + 2] * 256 * 256 +
              bytes[index + 3] * 256 +
              bytes[index + 4]
          );
          decoded.ReactivePowerWPhaseA = Int32UnsignedToSigned(
            bytes[index + 5] * 256 * 256 * 256 +
              bytes[index + 6] * 256 * 256 +
              bytes[index + 7] * 256 +
              bytes[index + 8]
          );
          decoded.ActivePowerWPhaseB = Int32UnsignedToSigned(
            bytes[index + 9] * 256 * 256 * 256 +
              bytes[index + 10] * 256 * 256 +
              bytes[index + 11] * 256 +
              bytes[index + 12]
          );
          decoded.ReactivePowerWPhaseB = Int32UnsignedToSigned(
            bytes[index + 13] * 256 * 256 * 256 +
              bytes[index + 14] * 256 * 256 +
              bytes[index + 15] * 256 +
              bytes[index + 16]
          );
          decoded.ActivePowerWPhaseC = Int32UnsignedToSigned(
            bytes[index + 17] * 256 * 256 * 256 +
              bytes[index + 18] * 256 * 256 +
              bytes[index + 19] * 256 +
              bytes[index + 20]
          );
          decoded.ReactivePowerWPhaseC = Int32UnsignedToSigned(
            bytes[index + 21] * 256 * 256 * 256 +
              bytes[index + 22] * 256 * 256 +
              bytes[index + 23] * 256 +
              bytes[index + 24]
          );
          decoded.ActivePowerWPhaseABC = Int32UnsignedToSigned(
            bytes[index + 25] * 256 * 256 * 256 +
              bytes[index + 26] * 256 * 256 +
              bytes[index + 27] * 256 +
              bytes[index + 28]
          );
          decoded.ReactivePowerWPhaseABC = Int32UnsignedToSigned(
            bytes[index + 29] * 256 * 256 * 256 +
              bytes[index + 30] * 256 * 256 +
              bytes[index + 31] * 256 +
              bytes[index + 32]
          );
        }

        //energy and power metering
        if ((clusterdID === 0x800b) & (attributID === 0x0000)) {
          index2 = index;
          decoded.Vrms = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.Irms = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.phase_angle = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2);
        }

        //voltage current multi metering
        if ((clusterdID === 0x800d) & (attributID === 0x0000)) {
          decoded.VrmsA = UintToInt(bytes[index + 1] * 256 + bytes[index + 2], 2) / 10;
          decoded.IrmsA = UintToInt(bytes[index + 3] * 256 + bytes[index + 4], 2) / 10;
          decoded.PhaseA = UintToInt(bytes[index + 5] * 256 + bytes[index + 6], 2);
          decoded.VrmsB = UintToInt(bytes[index + 7] * 256 + bytes[index + 8], 2) / 10;
          decoded.IrmsB = UintToInt(bytes[index + 9] * 256 + bytes[index + 10], 2) / 10;
          decoded.PhaseB = UintToInt(bytes[index + 11] * 256 + bytes[index + 12], 2);
          decoded.VrmsC = UintToInt(bytes[index + 13] * 256 + bytes[index + 14], 2) / 10;
          decoded.IrmsC = UintToInt(bytes[index + 15] * 256 + bytes[index + 16], 2) / 10;
          decoded.PhaseC = UintToInt(bytes[index + 17] * 256 + bytes[index + 18], 2);
        }

        //concentration
        if ((clusterdID === 0x800c) & (attributID === 0x0000)) {
          decoded.Concentration = bytes[index] * 256 + bytes[index + 1];
        }
        //illuminance
        if ((clusterdID === 0x0400) & (attributID === 0x0000)) {
          decoded.Illuminance = bytes[index] * 256 + bytes[index + 1];
        }
        //Pressure
        if ((clusterdID === 0x0403) & (attributID === 0x0000)) {
          decoded.Pressure = UintToInt(bytes[index] * 256 + bytes[index + 1], 2);
        }
        //Occupancy
        if ((clusterdID === 0x0406) & (attributID === 0x0000)) {
          decoded.Occupancy = !(!bytes[index]);
        }
        // power quality by WattSense
        if ((clusterdID === 0x8052) & (attributID === 0x0000)) {
          index2 = index;
          decoded.frequency =
            (UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) + 22232) / 1000;
          index2 = index2 + 2;
          decoded.frequency_min =
            (UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) + 22232) / 1000;
          index2 = index2 + 2;
          decoded.frequency_max =
            (UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) + 22232) / 1000;
          index2 = index2 + 2;
          decoded.Vrms = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.Vrms_min = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.Vrms_max = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.Vpeak = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.Vpeak_min = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.Vpeak_max = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2) / 10;
          index2 = index2 + 2;
          decoded.over_voltage = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2);
          index2 = index2 + 2;
          decoded.sag_voltage = UintToInt(bytes[index2 + 1] * 256 + bytes[index2 + 2], 2);
        }

        //XYZ Acceleration : Last on XYZ
        if (clusterdID === 0x800f) {
          i = index + 1;
          if (attributID === 0x0000) {
            o = (decoded.Last = {});
            o.NbTriggedAcq = BytesToInt64(bytes, i, "U32");
            i += 4;
            o.Mean_X_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Max_X_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Dt_X_ms = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.Mean_Y_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Max_Y_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Dt_Y_ms = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.Mean_Z_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Max_Z_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Dt_Z_ms = BytesToInt64(bytes, i, "U16");
          } else if (attributID === 0x0001 || attributID === 0x0002 || attributID === 0x0003) {
            ext = attributID === 0x0001 ? "Stats_X" : attributID === 0x0002 ? "Stats_Y" : "Stats_Z";
            o = (decoded[ext] = {});
            o.NbAcq = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.MinMean_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.MinMax_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.MinDt = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.MeanMean_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.MeanMax_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.MeanDt = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.MaxMean_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.MaxMax_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.MaxDt = BytesToInt64(bytes, i, "U16");
            i += 2;
          } else if (attributID === 0x8000) {
            o = (decoded.Params = {});
            o.WaitFreq_Hz = BytesToInt64(bytes, i, "U16") / 10.0;
            i += 2;
            o.AcqFreq_Hz = BytesToInt64(bytes, i, "U16") / 10.0;
            i += 2;
            delay = BytesToInt64(bytes, i, "U16");
            i += 2;
            if (delay & 0x8000) delay = (delay & ~0x8000) * 60;
            o.NewWaitDelay_s = delay & 0x8000 ? (delay = (delay & ~0x8000) * 60) : delay;
            o.MaxAcqDuration_ms = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.Threshold_X_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Threshold_Y_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.Threshold_Z_G = BytesToInt64(bytes, i, "U16") / 100.0;
            i += 2;
            o.OverThrsh_Dt_ms = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.UnderThrsh_Dt_ms = BytesToInt64(bytes, i, "U16");
            i += 2;
            o.Range_G = BytesToInt64(bytes, i, "U16") / 100;
            i += 2;
            o.FilterSmoothCoef = BytesToInt64(bytes, i, "U8");
            i += 1;
            o.FilterGainCoef = BytesToInt64(bytes, i, "U8");
            i += 1;
            o = (decoded.Params.WorkingModes = {});
            o.SignalEachAcq = bytes[i] & 0x80 ? "true" : "false";
            o.RstAftStdRpt_X = bytes[i] & 0x01 ? "true" : "false";
            o.RstAftStdRpt_Y = bytes[i] & 0x02 ? "true" : "false";
            o.RstAftStdRpt_7 = bytes[i] & 0x04 ? "true" : "false";
          }
        }
      }

      //decode configuration response
      if (cmdID === 0x07) {
        //AttributID
        attributID = bytes[6] * 256 + bytes[7];
        decoded.zclheader.attributID = decimalToHex(attributID, 4);
        //status
        decoded.zclheader.status = bytes[4];
        //batch
        decoded.zclheader.batch = bytes[5];
      }

      //decode read configuration response
      if (cmdID === 0x09) {
        //AttributID
        attributID = bytes[6] * 256 + bytes[7];
        decoded.zclheader.attributID = decimalToHex(attributID, 4);
        //status
        decoded.zclheader.status = bytes[4];
        //batch
        decoded.zclheader.batch = bytes[5];

        //AttributType
        decoded.zclheader.attribut_type = bytes[8];
        //min
        decoded.zclheader.min = {};
        if ((bytes[9] & 0x80) === 0x80) {
          decoded.zclheader.min.value = (bytes[9] - 0x80) * 256 + bytes[10];
          decoded.zclheader.min.unity = "minutes";
        } else {
          decoded.zclheader.min.value = bytes[9] * 256 + bytes[10];
          decoded.zclheader.min.unity = "seconds";
        }
        //max
        decoded.zclheader.max = {};
        if ((bytes[11] & 0x80) === 0x80) {
          decoded.zclheader.max.value = (bytes[11] - 0x80) * 256 + bytes[12];
          decoded.zclheader.max.unity = "minutes";
        } else {
          decoded.zclheader.max.value = bytes[11] * 256 + bytes[12];
          decoded.zclheader.max.unity = "seconds";
        }
        decoded.lora.payload = "";
      }
    } else {
      decoded.batch = {};
      decoded.batch.report = "batch";
    }
  }

  return decoded;
}