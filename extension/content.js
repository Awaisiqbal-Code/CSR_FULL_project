(function () {
  const v2 = {
    hogQR: function (v3, v5, v6) {
      return v3(v5, v6);
    },
    RcuRg: function (v7, v8) {
      return v7 + v8;
    },
    VUFAt: function (v9, v10) {
      return v9 + v10;
    },
    aKZHb: function (v11, v12) {
      return v11(v12);
    },
    IgBeb: "no id",
    tlcIx: function (v13, v14) {
      return v13 === v14;
    },
    Izxos: function (v15, v16) {
      return v15 !== v16;
    },
    rXXKe: function (v17, v18) {
      return v17 !== v18;
    },
    rDlQc: "message"
  };
  var v19 = {};
  var v20 = 0;
  window.__lovDlAudio__ = function (v21) {
    const v22 = {
      LrMLk: function (v23, v24) {
        return v23(v24);
      }
    };
    return new Promise(function (v25, v26) {
      if (!v21) {
        return v26(new Error("no id"));
      }
      var v27 = ++v20 + "_" + Date.now();
      var v28 = setTimeout(function () {
        delete v19[v27];
        v26(new Error("audio dl timeout"));
      }, 20000);
      v19[v27] = {
        resolve: function (v29) {
          clearTimeout(v28);
          delete v19[v27];
          v25(v29);
        },
        reject: function (v30) {
          clearTimeout(v28);
          delete v19[v27];
          console.error("WCE AUDIO ERROR:", v30);
          v26(v30);
        }
      };
      const v31 = {
        source: "lov-wa-audio-request",
        reqId: v27,
        id: v21
      };
      window.postMessage(v31, "*");
    });
  };
  window.addEventListener("message", function (v32) {
    if (v32.source !== window || !v32.data || v32.data.source !== "lov-wa-audio-response") {
      return;
    }
    var v33 = v19[v32.data.reqId];
    if (!v33) {
      return;
    }
    if (v32.data.error) {
      v33.reject(new Error(v32.data.error));
    } else {
      v33.resolve(v32.data.data);
    }
  });
})();
(function () {
  const v34 = {
    GLSlD: function (v35, v36) {
      return v35 > v36;
    },
    McqSu: function (v37, v38) {
      return v37 !== v38;
    },
    oXcAz: "cjBdi",
    kNbLP: function (v39, v40) {
      return v39 !== v40;
    },
    ktjjj: function (v41, v42) {
      return v41 < v42;
    },
    KoEyL: function (v43, v44) {
      return v43 !== v44;
    },
    FrwhZ: function (v45, v46) {
      return v45(v46);
    },
    vOtFg: function (v47, v48) {
      return v47 < v48;
    },
    zQcge: function (v49, v50) {
      return v49 === v50;
    },
    FrPLo: "en-ca",
    qQgFQ: "MDY",
    BHfkb: "DMY",
    JhLrg: function (v51) {
      return v51();
    },
    fDncl: function (v52, v53) {
      return v52 instanceof v53;
    },
    eAGtB: "oApZS",
    zlikt: function (v54, v55) {
      return v54 < v55;
    },
    GRTUM: function (v56, v57) {
      return v56 <= v57;
    },
    PAbap: function (v58, v59) {
      return v58 !== v59;
    },
    tDcMc: "nnxiY",
    Froou: function (v60, v61) {
      return v60 > v61;
    },
    kBZTy: "HvUmp",
    OokYd: function (v62, v63) {
      return v62 || v63;
    },
    UILIM: function (v64, v65) {
      return v64 + v65;
    },
    bmbkM: function (v66, v67) {
      return v66 * v67;
    },
    WRxKm: function (v68, v69, v70) {
      return v68(v69, v70);
    },
    AGZYo: function (v71, v72) {
      return v71 !== v72;
    },
    QFyae: "qZgQD",
    SLviy: function (v73, v74) {
      return v73 * v74;
    },
    dCmVn: function (v75, v76) {
      return v75(v76);
    },
    tHdCy: "cFKPI",
    bzsyG: "YziEY",
    cFYTd: function (v77, v78) {
      return v77 > v78;
    },
    HNGku: function (v79, v80) {
      return v79 !== v80;
    },
    quUdg: "SNdSW",
    mMwKJ: "sXENJ",
    uWfKH: function (v81, v82, v83) {
      return v81(v82, v83);
    },
    tRAEq: function (v84, v85) {
      return v84(v85);
    },
    KeZlG: "apFzV",
    cwmJc: function (v86, v87, v88, v89) {
      return v86(v87, v88, v89);
    },
    NGXBZ: function (v90, v91) {
      return v90 === v91;
    },
    AAJED: "Iunrx",
    tOzXi: function (v92, v93) {
      return v92(v93);
    },
    xTYIH: function (v94, v95) {
      return v94 === v95;
    },
    IiXwP: "WVMDM",
    isSfA: function (v96, v97) {
      return v96 > v97;
    },
    KQhlm: function (v98, v99) {
      return v98 > v99;
    },
    wvXHO: function (v100, v101) {
      return v100 !== v101;
    },
    phPGp: function (v102, v103) {
      return v102(v103);
    },
    odTNi: "bGHOx",
    OGLRJ: "yJAMd",
    UWkNf: function (v104, v105) {
      return v104(v105);
    },
    mvVWA: "TtwBs",
    JuDLZ: "UYlXL",
    yDYHC: function (v106, v107) {
      return v106(v107);
    },
    pCUZW: function (v108, v109) {
      return v108(v109);
    },
    SGiCk: function (v110, v111) {
      return v110(v111);
    },
    Boloq: function (v112, v113) {
      return v112 !== v113;
    },
    xIyZB: "CbUCY",
    jAOTo: function (v114, v115) {
      return v114 > v115;
    },
    lXwBe: function (v116, v117) {
      return v116 + v117;
    },
    pZIYF: "pzUnj",
    jWrlc: function (v118, v119) {
      return v118(v119);
    },
    mShXK: function (v120, v121) {
      return v120(v121);
    },
    aQTus: function (v122, v123) {
      return v122 < v123;
    },
    LFTod: "CWmBN",
    bMXTe: "ysbCp",
    KeyHz: function (v124, v125) {
      return v124(v125);
    },
    JadmS: function (v126, v127) {
      return v126 - v127;
    },
    jLlIS: function (v128, v129) {
      return v128 >= v129;
    },
    nDhSZ: function (v130, v131) {
      return v130 * v131;
    },
    lMnEV: function (v132, v133) {
      return v132(v133);
    },
    xOVql: "EIPTW",
    mPKqb: function (v134, v135) {
      return v134 >= v135;
    },
    CGmjs: function (v136, v137) {
      return v136 > v137;
    },
    zVWtP: function (v138, v139) {
      return v138(v139);
    },
    qVCLC: function (v140) {
      return v140();
    },
    qbyCV: function (v141, v142, v143) {
      return v141(v142, v143);
    },
    bFZph: function (v144) {
      return v144();
    },
    ilRYs: function (v145, v146) {
      return v145(v146);
    },
    zNXZd: function (v147, v148) {
      return v147(v148);
    },
    aFvGj: function (v149, v150, v151) {
      return v149(v150, v151);
    },
    EaCHP: function (v152) {
      return v152();
    },
    NBkNF: function (v153, v154) {
      return v153 !== v154;
    },
    ltFkT: "uAevc",
    qZZhG: function (v155, v156) {
      return v155 - v156;
    },
    WRqrt: function (v157) {
      return v157();
    },
    hKpCg: function (v158) {
      return v158();
    },
    KjBnk: function (v159, v160) {
      return v159 >= v160;
    },
    PNfYS: function (v161) {
      return v161();
    },
    pGBiZ: function (v162, v163) {
      return v162 > v163;
    },
    Ksapf: "IJLEM",
    RLpxB: function (v164, v165) {
      return v164(v165);
    },
    TaGeo: function (v166, v167) {
      return v166(v167);
    },
    fEeTW: function (v168, v169) {
      return v168(v169);
    },
    KnTtI: function (v170, v171) {
      return v170 && v171;
    },
    twnpO: function (v172, v173) {
      return v172(v173);
    },
    OkUPZ: function (v174, v175, v176) {
      return v174(v175, v176);
    },
    GgmjW: function (v177, v178) {
      return v177(v178);
    },
    utNLC: "last 24 hours",
    uCAfe: function (v179, v180) {
      return v179 + v180;
    },
    jMnsR: "last ",
    hXQTg: " days",
    bWRPi: function (v181, v182, v183) {
      return v181(v182, v183);
    },
    idlkR: function (v184, v185) {
      return v184 != v185;
    },
    noyiY: function (v186, v187) {
      return v186 === v187;
    },
    HQlgA: "ngZON",
    BweDv: function (v188, v189) {
      return v188 / v189;
    },
    zclna: function (v190, v191) {
      return v190 % v191;
    },
    zPDXk: function (v192, v193) {
      return v192 >= v193;
    },
    DcASG: function (v194, v195) {
      return v194(v195);
    },
    XhGMW: function (v196, v197, v198) {
      return v196(v197, v198);
    },
    OPzqj: function (v199, v200) {
      return v199 !== v200;
    },
    YNVRY: "tpcwW",
    AFkHh: function (v201, v202, v203) {
      return v201(v202, v203);
    },
    KlHvm: "lov-wa-store",
    bDqIe: "message",
    QJYnC: function (v204, v205) {
      return v204 === v205;
    },
    ZalZE: "pYJQG",
    bMpGP: function (v206, v207) {
      return v206 === v207;
    },
    rkRlY: function (v208, v209) {
      return v208(v209);
    },
    WITES: function (v210) {
      return v210();
    },
    hrbDf: function (v211, v212) {
      return v211 >= v212;
    },
    UDWVG: "PxiaG",
    HWshn: "VtgMO",
    vecKT: function (v213) {
      return v213();
    },
    TLqtp: function (v214) {
      return v214();
    },
    aXrxQ: "AgoUd",
    anBSY: function (v215, v216) {
      return v215 + v216;
    },
    ArWFM: function (v217) {
      return v217();
    },
    eIjKV: function (v218, v219) {
      return v218 < v219;
    },
    xmnGW: function (v220) {
      return v220();
    },
    Lwpql: function (v221, v222) {
      return v221 !== v222;
    },
    iBGus: "CLzKQ",
    lgPzX: "kKyGj",
    ZJPCD: function (v223) {
      return v223();
    },
    TpFLf: function (v224) {
      return v224();
    },
    FqeSY: function (v225, v226) {
      return v225(v226);
    },
    USrqY: "VExEw",
    EzElV: function (v227, v228) {
      return v227 <= v228;
    },
    gDdKS: "WTvqP",
    kWhxi: function (v229, v230) {
      return v229 > v230;
    },
    ORtBl: function (v231) {
      return v231();
    },
    FxVbF: "tFGhZ",
    CRpgw: function (v232, v233) {
      return v232 !== v233;
    },
    ZzsqW: "BZFod",
    QHuRI: function (v234, v235) {
      return v234(v235);
    },
    zCmst: function (v236) {
      return v236();
    },
    JNLIF: function (v237, v238, v239) {
      return v237(v238, v239);
    },
    yfLCD: function (v240, v241, v242, v243, v244) {
      return v240(v241, v242, v243, v244);
    },
    dTLNf: function (v245, v246) {
      return v245 - v246;
    },
    QdJte: function (v247, v248, v249) {
      return v247(v248, v249);
    },
    AjEfO: function (v250, v251) {
      return v250(v251);
    },
    NwLDZ: "ctINx",
    XHXep: "CxrfC",
    zHNlc: function (v252, v253) {
      return v252(v253);
    },
    SrSgX: function (v254, v255) {
      return v254(v255);
    },
    xpUHm: "yamQx",
    Btxlf: function (v256, v257) {
      return v256 > v257;
    },
    jBluS: function (v258, v259) {
      return v258 > v259;
    },
    WhsEL: "eDGZB",
    lYiSy: function (v260, v261) {
      return v260 === v261;
    },
    LgFOK: function (v262, v263) {
      return v262(v263);
    },
    KktCX: "xncfQ",
    TYWWj: function (v264, v265) {
      return v264 > v265;
    },
    qHuyB: function (v266, v267) {
      return v266 + v267;
    },
    qXnOn: function (v268, v269, v270) {
      return v268(v269, v270);
    },
    ofBDG: function (v271, v272) {
      return v271 === v272;
    },
    EjEsM: function (v273, v274) {
      return v273(v274);
    },
    HgTvI: function (v275, v276) {
      return v275(v276);
    },
    DTnMn: function (v277, v278) {
      return v277 !== v278;
    },
    qAXJt: "vHBpq",
    GYRhv: function (v279, v280, v281) {
      return v279(v280, v281);
    },
    PJmEK: function (v282, v283, v284) {
      return v282(v283, v284);
    },
    cFAEQ: function (v285, v286) {
      return v285 < v286;
    },
    jaOSl: function (v287, v288) {
      return v287 < v288;
    },
    iHyFi: "CUTMH",
    RavEN: function (v289, v290) {
      return v289(v290);
    },
    kUQPa: function (v291, v292) {
      return v291 + v292;
    },
    dujfI: function (v293, v294, v295) {
      return v293(v294, v295);
    },
    wTQXa: function (v296, v297) {
      return v296(v297);
    },
    zzbAq: function (v298, v299) {
      return v298 === v299;
    },
    BxyhX: "GUYrJ",
    ycQfd: function (v300, v301, v302) {
      return v300(v301, v302);
    },
    mpkDd: function (v303, v304, v305, v306) {
      return v303(v304, v305, v306);
    },
    wdLEW: function (v307, v308, v309) {
      return v307(v308, v309);
    },
    APvKW: function (v310, v311, v312) {
      return v310(v311, v312);
    },
    LhOCs: function (v313, v314, v315) {
      return v313(v314, v315);
    },
    eaZgO: function (v316, v317) {
      return v316(v317);
    },
    OUtNk: function (v318, v319, v320, v321) {
      return v318(v319, v320, v321);
    },
    ZWbGM: function (v322, v323) {
      return v322(v323);
    },
    VASyG: function (v324, v325, v326) {
      return v324(v325, v326);
    },
    nonOv: function (v327, v328, v329) {
      return v327(v328, v329);
    },
    ACXud: function (v330, v331) {
      return v330(v331);
    },
    xDGpK: function (v332, v333) {
      return v332 <= v333;
    },
    hkgai: "lov-wa-audio-response",
    vlvbU: "MknFd",
    VENhH: "en-us",
    KNjLp: function (v334, v335, v336) {
      return v334(v335, v336);
    },
    eEFOz: function (v337, v338) {
      return v337 > v338;
    },
    wkMWv: "2|5|3|7|8|4|0|1|6",
    SDlYN: "BBzgH",
    ieBva: function (v339) {
      return v339();
    },
    OTmOl: function (v340, v341) {
      return v340 === v341;
    },
    ubwrp: "robqh",
    tDMkD: function (v342, v343) {
      return v342(v343);
    },
    KFpzW: function (v344, v345) {
      return v344(v345);
    },
    opOfC: function (v346, v347) {
      return v346(v347);
    },
    OwbKX: function (v348, v349) {
      return v348(v349);
    },
    GDoKX: function (v350, v351) {
      return v350 - v351;
    },
    wkEZk: function (v352, v353) {
      return v352 <= v353;
    },
    Tpksz: function (v354, v355, v356) {
      return v354(v355, v356);
    },
    fbWOq: "StKCF",
    eKYxA: function (v357, v358) {
      return v357 === v358;
    },
    pmjpc: "CKqsa",
    wHQMP: function (v359, v360) {
      return v359(v360);
    },
    HyFIk: function (v361, v362) {
      return v361 === v362;
    },
    DWgvy: "CGhxE",
    GKVMx: function (v363, v364) {
      return v363(v364);
    },
    finoc: function (v365, v366) {
      return v365(v366);
    },
    HRSuR: function (v367, v368) {
      return v367 < v368;
    },
    jRLwI: function (v369, v370) {
      return v369 != v370;
    },
    hXmdw: function (v371, v372) {
      return v371 > v372;
    },
    TxSyf: "AUEFL",
    GqcUw: function (v373, v374) {
      return v373(v374);
    },
    dsmbw: function (v375, v376) {
      return v375 === v376;
    },
    UreHc: "dcPsZ",
    Matpo: "wnJfP",
    XsjCQ: function (v377, v378) {
      return v377(v378);
    },
    qOqtr: function (v379, v380) {
      return v379 > v380;
    },
    IRAfK: function (v381, v382) {
      return v381 + v382;
    },
    dxkld: function (v383, v384) {
      return v383 === v384;
    },
    gJgTQ: function (v385, v386) {
      return v385(v386);
    },
    pNxeO: function (v387, v388) {
      return v387 > v388;
    },
    eDDRl: "NAYrE",
    YPMvM: function (v389, v390) {
      return v389(v390);
    },
    WkCJA: function (v391, v392) {
      return v391 < v392;
    },
    DRxLY: function (v393, v394) {
      return v393 != v394;
    },
    wqbhe: function (v395, v396) {
      return v395 <= v396;
    },
    MkWZB: "TVIGr",
    PuoXw: function (v397, v398) {
      return v397(v398);
    },
    kiFjd: function (v399, v400) {
      return v399 instanceof v400;
    },
    uBsID: function (v401, v402) {
      return v401(v402);
    },
    Vrcre: function (v403, v404) {
      return v403 + v404;
    },
    Ddolt: function (v405, v406) {
      return v405 === v406;
    },
    QTRQU: function (v407, v408) {
      return v407(v408);
    },
    dugXR: function (v409, v410) {
      return v409(v410);
    },
    lrTdr: "wzKoy",
    ikpvL: function (v411, v412) {
      return v411(v412);
    },
    hptwH: function (v413, v414) {
      return v413 instanceof v414;
    },
    fhtBg: "DzSIP",
    xhHDL: function (v415, v416, v417) {
      return v415(v416, v417);
    },
    KHuoD: function (v418, v419) {
      return v418 !== v419;
    },
    gjXOT: function (v420, v421) {
      return v420 !== v421;
    },
    cMmwK: "aYMRL",
    xvNtJ: function (v422, v423) {
      return v422(v423);
    },
    rcyYi: "lov-wa-store-request"
  };
  var v424 = new Map();
  var v425 = new Map();
  try {
    window.addEventListener("message", function (v426) {
      const v427 = {
        WFZbQ: function (v428, v429) {
          return v428 > v429;
        }
      };
      if (v426.source !== window || !v426.data || v426.data.source !== "lov-wa-store" || !Array.isArray(v426.data.chats)) {
        return;
      }
      var v430 = new Map();
      var v431 = new Map();
      for (var v432 = 0; v432 < v426.data.chats.length; v432++) {
        var v433 = v426.data.chats[v432];
        if (v433.name) {
          v430.set(String(v433.name).replace(/\s+/g, " ").trim().toLowerCase(), !!v433.isGroup);
        }
        if (v433.id) {
          v431.set(String(v433.id), !!v433.isGroup);
        }
      }
      v424 = v430;
      v425 = v431;
    });
    window.postMessage({
      source: "lov-wa-store-request"
    }, "*");
  } catch (v434) {}
  var v435 = {
    image: "<image omitted>",
    video: "<video omitted>",
    audio: "<audio omitted>",
    voice: "<voice message omitted>",
    document: "<document omitted>",
    sticker: "<sticker omitted>",
    gif: "<gif omitted>",
    location: "<location omitted>",
    contact: "<contact omitted>",
    poll: "<poll omitted>",
    deleted: "<message deleted>",
    unknown: "<attachment omitted>"
  };
  function v436(v437) {
    // WCE-PATCH (A3): decide once per chat and cache. The original recomputed
    // from whatever subset it was handed, so different calls could disagree
    // about the same chat.
    if (__wceFmt) {
      return __wceFmt;
    }
    __wceFmt = __wceDetectFmt(v437 || []);
    return __wceFmt;
  }
  function v438(v437) {
    var v439 = 0;
    var v440 = 0;
    for (var v441 = 0; v441 < v437.length; v441++) {
      var v442 = v437[v441] && v437[v441].timestamp;
      if (!v442) {
        continue;
      }
      var v443 = v442.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
      if (!v443) {
        continue;
      }
      var v444 = +v443[1];
      var v445 = +v443[2];
      if (v444 > 12 && v445 <= 12) {
        v439++;
      } else if (v445 > 12 && v444 <= 12) {
        v440++;
      }
    }
    if (v439 > v440) {
      return "DMY";
    }
    if (v440 > v439) {
      return "MDY";
    }
    try {
      var v446 = (navigator.language || "").toLowerCase();
      if (v446.indexOf("en-us") === 0 || v446.indexOf("en-ca") === 0) {
        return "MDY";
      }
    } catch (v447) {}
    return "DMY";
  }
  function v448(v449, v450) {
    if (!v449) {
      return null;
    }
    var v451 = v449.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
    if (!v451) {
      return null;
    }
    var v452 = +v451[1];
    var v453 = +v451[2];
    var v454 = +v451[3];
    if (v454 < 100) {
      v454 += 2000;
    }
    var v455;
    var v456;
    if (v452 > 12 && v453 <= 12) {
      v455 = v452;
      v456 = v453;
    } else if (v453 > 12 && v452 <= 12) {
      v456 = v452;
      v455 = v453;
    } else {
      var v457 = v450 || "DMY";
      if (v457 === "MDY") {
        v456 = v452;
        v455 = v453;
      } else {
        v455 = v452;
        v456 = v453;
      }
    }
    var v458 = new Date(v454, v456 - 1, v455);
    if (isNaN(v458.getTime())) {
      return null;
    } else {
      return v458;
    }
  }
  function v459(v460) {
    let v461 = v460.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
    if (!v461) {
      return null;
    }
    let v462 = Number(v461[1]);
    let v463 = Number(v461[2]);
    let v464 = v461[3]?.toLowerCase();
    if (v464 === "pm" && v462 < 12) {
      v462 += 12;
    }
    if (v464 === "am" && v462 === 12) {
      v462 = 0;
    }
    if (v462 > 23 || v463 > 59) {
      return null;
    } else {
      return v462 * 60 + v463;
    }
  }
  function v465(v466) {
    const v467 = {
      OHWeG: function (v468, v469, v470) {
        return v468(v469, v470);
      }
    };
    let v471 = v466.match(/^(\d{1,2}):(\d{2})$/);
    if (v471) {
      return Number(v471[1]) * 60 + Number(v471[2]);
    } else {
      return null;
    }
  }
  function v472(v473, v474) {
    let v475 = v474.keyword?.trim().toLowerCase() ?? "";
    if (!v475) {
      return v473;
    }
    return v473.filter(function (v476) {
      return (v476.text ?? "").toLowerCase().includes(v475);
    });
  }
  function v477(v478, v479) {
    let v480 = [];
    if (v478.media === "voice") {
      let v481 = "[Voice message";
      if (v478.mediaDuration) {
        v481 += " Â· " + v478.mediaDuration;
      }
      v481 += "]";
      v480.push(v481);
    } else if (v478.media) {
      v480.push(v435[v478.media]);
    }
    if (v478.text) {
      v480.push(v478.text);
    }
    return v480.join(" ").trim();
  }
  function v482(v483, v484) {
    if (v483.system && !v484.includeSystemMessages) {
      return "";
    }
    let v485 = v477(v483, v484);
    if (!v485 && !v483.system) {
      return "";
    }
    let v486 = [];
    if (v484.includeTimestamps && v483.timestamp) {
      v486.push("[" + v483.timestamp + "]");
    }
    if (v483.system) {
      v486.push(v485 || "");
      return v486.join(" ").trim();
    }
    let v487 = v483.fromMe ? "You" : v483.sender;
    if (v484.includeSenderNames && v487) {
      v486.push(v487 + ":");
    }
    v486.push(v485);
    return v486.join(" ").trim();
  }
  function v488(v489, v490) {
    let v491 = v472(v489.messages, v490);
    if (v490.preserveOrder) {
      return v491;
    } else {
      return [...v491].reverse();
    }
  }
  function v492(v493, v494) {
    let v495 = v488(v493, v494).map(v496 => v482(v496, v494)).filter(v497 => v497.length > 0);
    return v493.title + "\n" + "-".repeat(v493.title.length) + "\n" + v495.join("\n") + "\n";
  }
  var v498 = "=".repeat(48);
  function v499(v500, v501) {
    const v502 = {
      fphXi: function (v503, v504) {
        return v503 || v504;
      },
      nFLpd: "DMY",
      dmHAL: function (v505, v506) {
        return v505 === v506;
      },
      cCjpH: "MDY",
      HmrEn: function (v507, v508) {
        return v507(v508);
      },
      CEyNZ: function (v509, v510) {
        return v509 > v510;
      },
      LDrmu: function (v511, v512) {
        return v511 + v512;
      }
    };
    return v500.map(v513 => {
      let v514 = v488(v513, v501).map(v515 => v482(v515, v501)).filter(v516 => v516.length > 0);
      return v498 + "\nCHAT: " + v513.title + "\n" + v498 + "\n\n" + v514.join("\n");
    }).join("\n\n\n") + "\n\n" + v498 + "\nEND OF EXPORT\n" + v498 + "\n";
  }
  function v517(v518) {
    return v518.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function v519(v520, v521) {
    if (v520.system && !v521.includeSystemMessages) {
      return "";
    }
    let v522 = v477(v520, v521);
    if (!v522 && !v520.system) {
      return "";
    }
    if (v520.system) {
      return "<div class=\"sys\">" + v517(v522) + "</div>";
    }
    let v523 = v520.fromMe ? "out" : "in";
    let v524 = v520.fromMe ? "You" : v520.sender;
    let v525 = [];
    if (v521.includeSenderNames && v524) {
      v525.push("<span class=\"who\">" + v517(v524) + "</span>");
    }
    if (v521.includeTimestamps && v520.timestamp) {
      v525.push("<span class=\"ts\">" + v517(v520.timestamp) + "</span>");
    }
    return "<div class=\"row " + v523 + "\"><div class=\"bubble\">" + (v525.length ? "<div class=\"meta\">" + v525.join(" ") + "</div>" : "") + "<div class=\"text\">" + v517(v522).replace(/\n/g, "<br>") + "</div></div></div>";
  }
  function v526(v527, v528) {
    return "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>" + v517(v527) + "</title>\n<style>\n  :root { color-scheme: light dark; }\n  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #e5ddd5; color: #111; }\n  header { position: sticky; top: 0; background: #075e54; color: #fff; padding: 14px 18px; font-weight: 700; }\n  main { max-width: 780px; margin: 0 auto; padding: 16px; }\n  h2 { font-size: 15px; margin: 24px 0 8px; color: #075e54; }\n  .row { display: flex; margin: 4px 0; }\n  .row.out { justify-content: flex-end; }\n  .bubble { max-width: 78%; padding: 6px 9px; border-radius: 8px; background: #fff; box-shadow: 0 1px 0.5px rgba(0,0,0,.13); }\n  .row.out .bubble { background: #dcf8c6; }\n  .meta { font-size: 11px; color: #667781; margin-bottom: 2px; display: flex; gap: 8px; }\n  .who { font-weight: 700; color: #075e54; }\n  .text { font-size: 14px; white-space: pre-wrap; word-wrap: break-word; }\n  .sys { text-align: center; margin: 10px 0; }\n  .sys::before { content: \"\"; }\n  .sys { font-size: 12px; color: #54656f; background: #fdf4c8; display: inline-block; padding: 4px 10px; border-radius: 6px; }\n  .sys-wrap { text-align: center; }\n</style>\n</head>\n<body>\n<header>WhatsApp Chat Export</header>\n<main>\n" + v528 + "\n</main>\n</body>\n</html>";
  }
  function v529(v530, v531, v532) {
    let v533 = v488(v530, v531).map(v534 => v519(v534, v531)).filter(v535 => v535.length > 0).join("\n");
    return "" + (v532 ? "<h2>" + v517(v530.title) + "</h2>\n" : "") + v533;
  }
  function v536(v537, v538) {
    if ("apFzV" === "apFzV") {
      return v526(v537.title, v529(v537, v538, false));
    } else {
      v539[v540] = true;
      return v541[v542];
    }
  }
  function v543(v544, v545) {
    return v526("Combined export", v544.map(v546 => v529(v546, v545, true)).join("\n"));
  }
  var v547 = v548 => new Promise(v549 => setTimeout(v549, v548));
  var v550 = 1200;
  var v551 = 2500;
  async function v552(v553, {
    timeout: v554 = 15000,
    interval: v555 = 25
  } = {}) {
    let v556 = Date.now();
    while (true) {
      let v557 = v553();
      if (v557) {
        return v557;
      }
      if (Date.now() - v556 > v554) {
        throw Error("Timed out waiting for WhatsApp UI");
      }
      await v547(v555);
    }
  }
  function v558() {
    return document.querySelector("#pane-side") ?? document.querySelector("[aria-label=\"Chat list\"]") ?? document.querySelector("div[role=\"grid\"]") ?? document.querySelector("[role=\"listitem\"]")?.parentElement ?? null;
  }
  function v559() {
    let v560 = v558() ?? document;
    let v561 = Array.from(v560.querySelectorAll("[role=\"listitem\"]"));
    if (v561.length === 0) {
      v561 = Array.from(v560.querySelectorAll("div[role=\"row\"], [role=\"gridcell\"]"));
    }
    if (v561.length === 0) {
      let v562 = new Set();
      v561 = Array.from(v560.querySelectorAll("span[title]")).map(v563 => v563.closest("[role=\"listitem\"], div[role=\"row\"], li")).filter(v564 => !v564 || v562.has(v564) ? false : (v562.add(v564), true));
    }
    return v561;
  }
  function v565(v566) {
    let v567 = v566.querySelector("span[title]");
    if (v567?.getAttribute("title")) {
      return v567.getAttribute("title").trim();
    } else {
      return (v566.querySelector("span[dir=\"auto\"]")?.textContent ?? "").trim();
    }
  }
  function v568(v569) {
    let v570 = v569.querySelectorAll("span[dir=\"auto\"]");
    return (v570.length > 1 ? v570[v570.length - 1].textContent?.trim() : "") || undefined;
  }
  // Detect whether a WhatsApp chat is currently unread.
  function __wceIsUnreadChat(row) {
    if (!row) {
      return false;
    }
    try {
      var targetName = String(v565(row) || "").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!targetName) {
        return false;
      }
      var rows = Array.from(document.querySelectorAll("[role=\"listitem\"]"));
      if (!rows.length) {
        rows = Array.from(document.querySelectorAll("div[role=\"row\"]"));
      }
      if (!rows.length) {
        rows = Array.from(document.querySelectorAll("[role=\"gridcell\"]"));
      }
      var badges = document.querySelectorAll("[data-testid=\"icon-unread-count\"]");
      for (var i = 0; i < badges.length; i++) {
        var br = badges[i].getBoundingClientRect();
        var y = (br.top + br.bottom) / 2;
        var matches = rows.filter(function (candidate) {
          var r = candidate.getBoundingClientRect();
          return y >= r.top && y <= r.bottom && candidate.querySelector("span[title]");
        });
        matches.sort(function (a, b) {
          return b.getBoundingClientRect().width - a.getBoundingClientRect().width;
        });
        if (!matches.length) {
          continue;
        }
        var titleEl = matches[0].querySelector("span[title]");
        if (!titleEl) {
          continue;
        }
        var unreadName = String(titleEl.getAttribute("title") || "").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
        if (unreadName === targetName) {
          return true;
        }
      }
    } catch (e) {
      console.log("[WCE] unread check error:", e);
    }
    return false;
  }
  function v571(v572) {
    try {
      let v573 = (v572.querySelector("span[title]")?.getAttribute("title") || "").replace(/\s+/g, " ").trim();
      if (v573) {
        let v574 = v424.get(v573.toLowerCase());
        if (v574 !== undefined) {
          return v574;
        }
      }
    } catch (v575) {}
    if (v572.querySelector("[data-icon=\"default-group\"], [data-icon=\"default-group-refreshed\"], [data-icon=\"group\"]")) {
      return true;
    }
    let v576 = (v572.getAttribute("aria-label") || "").toLowerCase();
    if (/\bgroup\b/.test(v576) || /\bgruppe\b/.test(v576) || /\bgrupo\b/.test(v576) || /\bgroupe\b/.test(v576)) {
      return true;
    }
    let v577 = v572.querySelectorAll("span[dir=\"auto\"]");
    let v578 = v577.length > 1 ? (v577[v577.length - 1].textContent || "").trim() : "";
    let v579 = v578.match(/^([^:\n]{1,40}):\s+\S/);
    if (v579) {
      let v580 = v579[1].trim();
      let v581 = (v572.querySelector("span[title]")?.getAttribute("title") || "").trim();
      if (v580 && v580.toLowerCase() !== "you" && v580.toLowerCase() !== v581.toLowerCase()) {
        return true;
      }
    }
    return false;
  }
  function v582(v583) {
    const v584 = {
      YbXHK: function (v585, v586, v587) {
        return v585(v586, v587);
      },
      RGXVF: function (v588, v589) {
        return v588(v589);
      },
      SLOOj: function (v590, v591) {
        return v590 === v591;
      },
      LIhEs: "bGHOx"
    };
    let v592 = new Set();
    v583.querySelectorAll("[aria-label]").forEach(v593 => {
      const v594 = {
        cVotQ: function (v595, v596, v597) {
          return v595(v596, v597);
        },
        MgIcs: function (v598, v599) {
          return v584.RGXVF(v598, v599);
        }
      };
      if (v584.SLOOj("gAjoj", "bGHOx")) {
        if (v600.system && !v601.includeSystemMessages) {
          return "";
        }
        let v602 = AmiOmf.cVotQ(v603, v604, v605);
        if (!v602 && !v606.system) {
          return "";
        }
        if (v607.system) {
          return "<div class=\"sys\">" + AmiOmf.MgIcs(v608, v602) + "</div>";
        }
        let v609 = v610.fromMe ? "out" : "in";
        let v611 = v612.fromMe ? "You" : v613.sender;
        let v614 = [];
        if (v615.includeSenderNames && v611) {
          v614.push("<span class=\"who\">" + AmiOmf.MgIcs(v616, v611) + "</span>");
        }
        if (v617.includeTimestamps && v618.timestamp) {
          v614.push("<span class=\"ts\">" + v619(v620.timestamp) + "</span>");
        }
        return "<div class=\"row " + v609 + "\"><div class=\"bubble\">" + (v614.length ? "<div class=\"meta\">" + v614.join(" ") + "</div>" : "") + "<div class=\"text\">" + v621(v602).replace(/\n/g, "<br>") + "</div></div></div>";
      } else {
        let v622 = v593.getAttribute("data-icon") ?? "";
        if (/label/i.test(v622)) {
          let v623 = (v593.getAttribute("aria-label") || "").trim();
          if (v623) {
            v592.add(v623);
          }
        }
      }
    });
    return Array.from(v592);
  }
  function v624(v625) {
    const v626 = {
      TtzlJ: function (v627, v628) {
        return v627(v628);
      }
    };
    for (let v629 of v559()) {
      let v630 = v565(v629);
      if (!!v630 && !v625.has(v630)) {
        v625.set(v630, {
          id: v630,
          title: v630,
          preview: v568(v629),
          isGroup: v571(v629),
          labels: v582(v629)
        });
      }
    }
  }
  var v631 = new Map();
  function v632(v633) {
    try {
      var v634 = v633.scrollTop;
      for (var v635 of v559()) {
        var v636 = v637(v565(v635));
        if (v636) {
          v631.set(v636, v634);
        }
      }
    } catch (v638) {}
  }
  function v639(v640) {
    const v641 = {
      wuVdA: function (v642, v643) {
        return v642(v643);
      },
      lpOpd: function (v644, v645) {
        return v644 !== v645;
      },
      NxpdX: "lov-wa-store"
    };
    if (v640.scrollHeight > v640.clientHeight + 20) {
      return v640;
    } else {
      return Array.from(v640.querySelectorAll("div")).find(v646 => {
        let v647 = getComputedStyle(v646);
        return /(auto|scroll)/.test(v647.overflowY) && v646.scrollHeight > v646.clientHeight + 20;
      }) ?? v640;
    }
  }
  var __LOV_TIME_RE = /^(\d{1,2})[:.](\d{2})(?:\s*([ap])\.?\s?m?\.?)?$/i;
  var __LOV_DATE_RE = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/;
  var __lovNamesCache = null;
  var __lovNamesDay = null;
  function __lovNorm(v) {
    return String(v == null ? "" : v).toLowerCase().replace(/[\s.,\u00a0]+/g, "");
  }
  function __lovDayNames() {
    var stamp = new Date().toDateString();
    if (__lovNamesCache && __lovNamesDay === stamp) {
      return __lovNamesCache;
    }
    var map = Object.create(null);
    try {
      var lang = document.documentElement && document.documentElement.lang || navigator.language || "en";
      var longFmt = new Intl.DateTimeFormat(lang, {
        weekday: "long"
      });
      var shortFmt = new Intl.DateTimeFormat(lang, {
        weekday: "short"
      });
      var today = new Date();
      for (var i = 0; i <= 6; i++) {
        var d = new Date(today.getTime());
        d.setDate(today.getDate() - i);
        var a = __lovNorm(longFmt.format(d));
        var b = __lovNorm(shortFmt.format(d));
        if (a && map[a] === undefined) {
          map[a] = i;
        }
        if (b && map[b] === undefined) {
          map[b] = i;
        }
      }
      try {
        var rtf = new Intl.RelativeTimeFormat(lang, {
          numeric: "auto"
        });
        var t0 = __lovNorm(rtf.format(0, "day"));
        var t1 = __lovNorm(rtf.format(-1, "day"));
        if (t0) {
          map[t0] = 0;
        }
        if (t1) {
          map[t1] = 1;
        }
      } catch (e) {}
    } catch (e) {}
    map.today = 0;
    map.yesterday = 1;
    __lovNamesCache = map;
    __lovNamesDay = stamp;
    return map;
  }
  function __lovLooksLikeStamp(t) {
    if (!t) {
      return false;
    }
    if (__LOV_TIME_RE.test(t) || __LOV_DATE_RE.test(t)) {
      return true;
    }
    return __lovDayNames()[__lovNorm(t)] !== undefined;
  }
  function __lovRowLabel(v648) {
    try {
      var nodes = v648.querySelectorAll("span,div");
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.firstElementChild) {
          continue;
        }
        var t = (n.textContent || "").trim();
        if (!t || t.length > 24) {
          continue;
        }
        if (__lovLooksLikeStamp(t)) {
          return t;
        }
      }
    } catch (e) {}
    return null;
  }
  function __lovDateOrder() {
    try {
      var rows = v559();
      var samples = [];
      for (var i = 0; i < rows.length; i++) {
        var l = __lovRowLabel(rows[i]);
        if (l && __LOV_DATE_RE.test(l)) {
          samples.push({
            timestamp: l
          });
        }
      }
      return v436(samples);
    } catch (e) {
      try {
        return v436([]);
      } catch (e2) {
        return "DMY";
      }
    }
  }
  function __lovParseDate(s, order) {
    var limit = Date.now() + 86400000;
    var orders = [order, order === "MDY" ? "DMY" : "MDY"];
    for (var i = 0; i < orders.length; i++) {
      var d = v448(s, orders[i]);
      if (!d) {
        continue;
      }
      d = new Date(d.getTime());
      d.setHours(23, 59, 59, 999);
      if (d.getTime() <= limit) {
        return d;
      }
    }
    return null;
  }
  function __lovLabelToDate(label, order) {
    var s = String(label || "").trim();
    var m;
    if (__LOV_DATE_RE.test(s)) {
      return __lovParseDate(s, order);
    }
    if (m = s.match(__LOV_TIME_RE)) {
      var h = +m[1];
      var mi = +m[2];
      if (m[3]) {
        h = h % 12;
        if (/p/i.test(m[3])) {
          h += 12;
        }
      }
      var t = new Date();
      t.setHours(h, mi, 0, 0);
      if (t.getTime() > Date.now() + 60000) {
        t.setDate(t.getDate() - 1);
      }
      return t;
    }
    var back = __lovDayNames()[__lovNorm(s)];
    if (back === undefined) {
      return null;
    }
    var w = new Date();
    w.setHours(23, 59, 59, 999);
    w.setDate(w.getDate() - back);
    return w;
  }
  function __lovIsPinned(v648) {
    try {
      return !!v648.querySelector("[data-icon=\"pinned\"],[data-icon=\"pinned2\"],[data-icon=\"pinned-refreshed\"],[data-icon=\"status-pinned\"]");
    } catch (e) {
      return false;
    }
  }
  function __lovRowState(v648, ctx) {
    var label = __lovRowLabel(v648);
    if (!label) {
      return "unknown";
    }
    var d = __lovLabelToDate(label, ctx.order);
    if (!d) {
      return "unknown";
    }
    if (d.getTime() >= ctx.cutoffTime) {
      return "fresh";
    } else {
      return "stale";
    }
  }
  async function __lovMakeCtx(__lovOpts) {
    var opts = __lovOpts;
    try {
      if (!opts || opts.dayRange == null) {
        var got = await chrome.storage.local.get("export-options");
        var saved = got && got["export-options"];
        if (saved && saved.dayRange != null) {
          opts = {
            dayRange: saved.dayRange
          };
        }
      }
    } catch (e) {}
    try {
      var cutoff = v649(opts);
      return {
        days: v650(opts),
        cutoffTime: cutoff.getTime(),
        order: __lovDateOrder(),
        stopAfter: 8,
        minScans: 3,
        scans: 0,
        trailingStale: 0,
        kept: 0,
        skippedIds: new Set()
      };
    } catch (e) {
      return null;
    }
  }
  function __lovCollect(v625, ctx) {
    if (!ctx) {
      return v624(v625);
    }
    var rows = v559();
    var trailing = 0;
    ctx.scans++;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var id = v565(row);
      if (!id) {
        continue;
      }
      var state = __lovRowState(row, ctx);
      if (state === "stale") {
        if (!__lovIsPinned(row)) {
          trailing++;
        }
        if (!v625.has(id)) {
          ctx.skippedIds.add(id);
        }
        continue;
      }
      if (state === "fresh") {
        trailing = 0;
      }
      if (!v625.has(id)) {
        v625.set(id, {
          id: id,
          title: id,
          preview: v568(row),
          isGroup: v571(row),
          labels: v582(row)
        });
        ctx.kept++;
      }
    }
    ctx.trailingStale = trailing;
    return trailing;
  }
  function __lovShouldStop(ctx) {
    return !!ctx && !!(ctx.scans >= ctx.minScans) && !!(ctx.trailingStale >= ctx.stopAfter);
  }
  async function v651(__lovOpts) {
    const __lovCtx = await __lovMakeCtx(__lovOpts);
    let v652 = v639(await v552(() => v559().length > 0 ? v558() : null, {
      timeout: 20000
    }));
    let v653 = v652.scrollTop;
    let v654 = new Map();
    __lovCollect(v654, __lovCtx);
    v632(v652);
    v652.scrollTop = 0;
    v652.dispatchEvent(new Event("scroll", {
      bubbles: true
    }));
    await v547(60);
    let v655 = 0;
    for (let v656 = 0; v656 < v550; v656++) {
      __lovCollect(v654, __lovCtx);
      v632(v652);
      if (__lovShouldStop(__lovCtx)) {
        break;
      }
      let v657 = Math.max(0, v652.scrollHeight - v652.clientHeight);
      if (v652.scrollTop >= v657 - 4) {
        v655 += 1;
        if (v655 >= 2) {
          break;
        }
        await v547(60);
      } else {
        v655 = 0;
        v652.scrollTop = Math.min(v657, v652.scrollTop + Math.max(200, v652.clientHeight * 0.8));
        v652.dispatchEvent(new Event("scroll", {
          bubbles: true
        }));
        await v547(35);
      }
    }
    const v658 = {};
    function __wceNorm(value) {
      return String(value || "").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    }
    var __wceUnreadKeys = new Set(Array.from(__lovCtx && __lovCtx.__wceUnreadIds || []).map(__wceNorm));
    var __wceFinalChats = Array.from(v654.values()).filter(function (chat) {
      return !__wceUnreadKeys.has(__wceNorm(chat && chat.id));
    });
    console.log("[WCE] FINAL FILTERED CHATS:", __wceFinalChats.map(function (c) {
      return c.id;
    }));
    v658.bubbles = true;
    v652.scrollTop = v653;
    v652.dispatchEvent(new Event("scroll", v658));
    var __wceFinalUnreadSummary = Array.from(__lovCtx && __lovCtx.__wceUnreadSummary || []);

    // Keep the latest unread summary available to UI/export/audit code.
    window.__wceLastUnreadSummary = __wceFinalUnreadSummary;
    try {
      chrome.storage.local.set({
        "wce-unread-summary": __wceFinalUnreadSummary,
        "wce-unread-count": __wceFinalUnreadSummary.length
      });
    } catch (e) {}

    // Useful internally; GET_CHATS also returns explicit metadata below.
    __wceFinalChats.__wceUnreadSummary = __wceFinalUnreadSummary;
    return __wceFinalChats;
  }
  function v637(v659) {
    return v659.replace(/\s+/g, " ").trim().toLowerCase();
  }
  function v660(v661) {
    const v662 = {
      bubbles: true,
      cancelable: true,
      view: window
    };
    let v663 = v662;
    for (let v664 of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      v661.dispatchEvent(new MouseEvent(v664, v663));
    }
  }
  async function v665(v666) {
    const v667 = {
      YGnXM: "EIPTW",
      NTDzx: function (v668, v669) {
        return v668(v669);
      },
      xWLMf: function (v670) {
        return v670();
      },
      QIIlt: function (v671, v672) {
        return v671 >= v672;
      },
      fbnWM: function (v673, v674) {
        return v673 !== v674;
      },
      weCva: function (v675, v676) {
        return v675 > v676;
      }
    };
    let v677 = v637(v666);
    let v678 = v637(v679());
    for (let v680 = 0; v680 < 3; v680++) {
      let v681 = await v682(v666);
      if (!v681) {
        throw Error("Chat \"" + v666 + "\" not found in list");
      }
      v660(v681.querySelector("span[title]") ?? v681.querySelector("[role=\"button\"], [tabindex]") ?? v681);
      let v683 = await v552(() => {
        let v684 = v667.NTDzx(v637, v667.xWLMf(v679));
        if (v684 === v677) {
          return true;
        }
        if (v667.QIIlt(v680, 1) && v684 && v667.fbnWM(v684, v678) && v667.weCva(v685().length, 0)) {
          return true;
        }
        return null;
      }, {
        timeout: 2500,
        interval: 20
      }).catch(() => false);
      await v552(() => v685().length > 0 ? true : v686(), {
        timeout: 8000
      });
      if (v683) {
        return;
      }
      v678 = v637(v679());
      await v547(120);
    }
    throw Error("WhatsApp did not switch to \"" + v666 + "\"");
  }
  async function v682(v687) {
    let v688 = v639(await v552(() => v558(), {
      timeout: 20000
    }));
    let v689 = v637(v687);
    let v690 = () => v559().find(v691 => v637(v565(v691)) === v689);
    let v692 = v690();
    if (v692) {
      return v692;
    }
    if (v631.has(v689)) {
      let v693 = v631.get(v689);
      if (Math.abs(v693 - v688.scrollTop) > 4) {
        v688.scrollTop = v693;
        v688.dispatchEvent(new Event("scroll", {
          bubbles: true
        }));
        await v547(40);
        let v694 = v690();
        if (v694) {
          return v694;
        }
      }
    }
    let v695 = () => Math.max(0, v688.scrollHeight - v688.clientHeight);
    let v696 = () => Math.max(200, v688.clientHeight * 0.8);
    let v697 = v688.scrollTop;
    let v698 = async v699 => {
      v688.scrollTop = v699;
      v688.dispatchEvent(new Event("scroll", {
        bubbles: true
      }));
      await v547(40);
    };
    for (let v700 = 0; v700 < v550; v700++) {
      let v701 = v695();
      if (v688.scrollTop >= v701 - 4) {
        break;
      }
      await v698(Math.min(v701, v688.scrollTop + v696()));
      let v702 = v690();
      if (v702) {
        return v702;
      }
    }
    if (v697 > 4) {
      await v698(0);
      let v703 = v690();
      if (v703) {
        return v703;
      }
      for (let v704 = 0; v704 < v550; v704++) {
        let v705 = v695();
        if (v688.scrollTop >= v697 || v688.scrollTop >= v705 - 4) {
          break;
        }
        await v698(Math.min(v705, v688.scrollTop + v696()));
        let v706 = v690();
        if (v706) {
          return v706;
        }
      }
    }
    return null;
  }
  function v686() {
    return document.querySelector("#main") ?? document.querySelector("div[role=\"application\"]")?.closest("div") ?? null;
  }
  function v679() {
    let v707 = v686();
    let v708 = v707?.querySelector("header span[title]") ?? v707?.querySelector("header span[dir='auto']") ?? null;
    return v708?.getAttribute("title")?.trim() || v708?.textContent?.trim() || "Chat";
  }
  function v709() {
    let v710 = v686();
    if (!v710) {
      return null;
    }
    let v711 = v710.querySelector("div[role=\"application\"]");
    if (v711 && v711.querySelector(".message-in, .message-out, div[data-id]")) {
      return v711;
    }
    let v712 = v710.querySelector(".copyable-area");
    if (v712 && v712.querySelector(".message-in, .message-out, div[data-id]")) {
      return v712;
    } else {
      return v710.querySelector(".message-in, .message-out, div[data-id]")?.parentElement ?? v710;
    }
  }
  function v713() {
    const v714 = {
      CeKpG: function (v715, v716) {
        return v715 !== v716;
      },
      zZUOQ: "sLXvB",
      tipmg: function (v717, v718) {
        return v717(v718);
      },
      gMKyW: function (v719, v720) {
        return v719 + v720;
      }
    };
    let v721 = v686();
    if (!v721) {
      return null;
    }
    let v722 = Array.from(v721.querySelectorAll("div")).filter(v723 => {
      const v724 = {
        Ausxq: function (v725) {
          return v725();
        }
      };
      if (v714.CeKpG("sLXvB", "sLXvB")) {
        let v726 = bYkdRS.Ausxq(v727) ?? v728;
        let v729 = v730.from(v726.querySelectorAll("[role=\"listitem\"]"));
        if (v729.length === 0) {
          v729 = v731.from(v726.querySelectorAll("div[role=\"row\"], [role=\"gridcell\"]"));
        }
        if (v729.length === 0) {
          let v732 = new v733();
          v729 = v734.from(v726.querySelectorAll("span[title]")).map(v735 => v735.closest("[role=\"listitem\"], div[role=\"row\"], li")).filter(v736 => !v736 || v732.has(v736) ? false : (v732.add(v736), true));
        }
        return v729;
      } else {
        let v737 = getComputedStyle(v723);
        return /(auto|scroll)/.test(v737.overflowY) && v723.scrollHeight > v723.clientHeight + 40;
      }
    });
    let v738 = v722.filter(v739 => v739.querySelector(".message-in, .message-out, div[data-id]"));
    if (v738.length > 0) {
      return v738.sort((v740, v741) => v741.scrollHeight - v741.clientHeight - (v740.scrollHeight - v740.clientHeight))[0];
    }
    if (v722.length > 0) {
      return v722.sort((v742, v743) => v743.scrollHeight - v743.clientHeight - (v742.scrollHeight - v742.clientHeight))[0];
    }
    let v744 = v709();
    while (v744) {
      let v745 = getComputedStyle(v744);
      if (/(auto|scroll)/.test(v745.overflowY) && v744.scrollHeight > v744.clientHeight) {
        return v744;
      }
      v744 = v744.parentElement;
    }
    return v721.querySelector(".copyable-area") ?? v721;
  }
  // WCE-PATCH (VOICE-2026): WhatsApp now keeps the message id on an
  // ancestor (data-testid="conv-msg-...") instead of the inner msg-container.
  function __wceFindDataId(el) {
    if (!el) {
      return "";
    }
    var p = el;
    for (var i = 0; i < 25 && p; i++, p = p.parentElement) {
      var id = p.getAttribute?.("data-id");
      if (id) {
        return id;
      }
      var testid = p.getAttribute?.("data-testid");
      if (testid && testid.startsWith("conv-msg-")) {
        return testid.replace("conv-msg-", "");
      }
    }
    var child = el.querySelector?.("[data-id]");
    if (child) {
      return child.getAttribute("data-id") || "";
    }
    var conv = el.querySelector?.("[data-testid^=\"conv-msg-\"]");
    if (conv) {
      return (conv.getAttribute("data-testid") || "").replace("conv-msg-", "");
    }
    return "";
  }
  function v746(v747, v748) {
    return __wceFindDataId(v747) || [v748.timestamp, v748.sender, v748.fromMe ? "out" : "in", v748.system ? "system" : "message", v748.media ?? "", v748.text].join("|");
  }
  function v749(v750) {
    let v751 = v750.querySelector("img[src^='blob:'], img[src^='data:'], video[src^='blob:'], video[src^='data:'], audio[src^='blob:'], audio[src^='data:']")?.getAttribute("src") ?? undefined;
    if (v751 && (v751.startsWith("blob:") || v751.startsWith("data:"))) {
      return v751;
    } else {
      return undefined;
    }
  }
  function v752() {
    let v753 = [];
    for (let v754 of v685()) {
      // WCE-PATCH (P1): the loading loop rescanned every rendered bubble on
      // each poll and re-ran the full parse over all of them. Results are now
      // cached against the node, so a rescan costs a WeakMap lookup.
      let __hit = __wceNodeCache.get(v754);
      if (__hit !== undefined) {
        if (__hit !== null) {
          v753.push(__hit);
        }
        continue;
      }
      let v755 = v756(v754);
      let v757 = v754.classList.contains("message-out");
      let {
        timestamp: v758,
        sender: v759
      } = v760(v754);
      let v761 = v755 ? undefined : v762(v754);
      let v763 = v764(v754);
      if (!v763 && !v761 && !v755) {
        __wceNodeCache.set(v754, null);
        continue;
      }
      let v765 = {
        timestamp: v758,
        sender: v759 || (v757 ? "You" : ""),
        fromMe: v757,
        text: v755 ? (v754.innerText ?? "").trim() : v763,
        system: v755,
        media: v761,
        mediaUrl: v761 ? v749(v754) : undefined,
        mediaDuration: v761 === "voice" ? __lovDur__(v754) : undefined
      };
      let __entry = {
        key: v746(v754, v765),
        message: v765
      };
      // Only cache fully-rendered bubbles: a node still hydrating can report an
      // empty timestamp, and caching that would freeze the bad value in place.
      if (v758) {
        __wceNodeCache.set(v754, __entry);
      }
      v753.push(__entry);
    }
    return v753;
  }
  async function v766(v767) {
    let v768 = await (await fetch(v767)).blob();
    return await new Promise((v769, v770) => {
      let v771 = new FileReader();
      v771.onload = () => v769(String(v771.result));
      v771.onerror = () => v770(v771.error ?? Error("read failed"));
      v771.readAsDataURL(v768);
    });
  }
  var v772 = new Map();
  var v773 = 7;
  /* ===================== WCE-PATCH: helpers ===================== */
  // Parsed-bubble cache, keyed on the DOM node. The loading loop rescans the
  // pane constantly; without this, every rescan re-ran the full parse (regex,
  // media probe, innerText) across every rendered bubble.
  var __wceNodeCache = new WeakMap();

  // Resolved timestamps live in a side table rather than on the message
  // objects. Those objects are structured-cloned to the panel and fed to the
  // txt/html formatters, so adding fields to them would leak internals into
  // exported output.
  var __wceTsMap = new WeakMap();
  function __wceGetTs(m) {
    var e = __wceTsMap.get(m);
    if (e) {
      return e.ts;
    } else {
      return undefined;
    }
  }

  // Per-chat date-format decision, reset when a chat is opened.
  var __wceFmt = null;
  function __wceResetFmt() {
    __wceFmt = null;
  }

  // Build a Date from (a, b, y) under an explicit ordering. Returns null if the
  // result is not a real calendar date, so 31/02 is rejected rather than
  // rolling over into March.
  function __wceMake(a, b, y, order) {
    if (y < 100) {
      y += 2000;
    }
    var day = order === "MDY" ? b : a;
    var mon = order === "MDY" ? a : b;
    if (mon < 1 || mon > 12 || day < 1 || day > 31) {
      return null;
    }
    var dt = new Date(y, mon - 1, day);
    if (isNaN(dt.getTime())) {
      return null;
    }
    if (dt.getDate() !== day || dt.getMonth() !== mon - 1) {
      return null;
    }
    return dt;
  }
  function __wceTriple(ts) {
    if (!ts) {
      return null;
    }
    var m = String(ts).match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
    if (m) {
      return {
        a: +m[1],
        b: +m[2],
        y: +m[3]
      };
    } else {
      return null;
    }
  }

  // WhatsApp shows relative labels instead of a date for recent days.
  function __wceRelative(ts) {
    if (!ts) {
      return null;
    }
    var s = String(ts).toLowerCase();
    var now = new Date();
    if (/\btoday\b|\bhoy\b|\baujourd/.test(s)) {
      var d0 = new Date(now);
      d0.setHours(0, 0, 0, 0);
      return d0;
    }
    if (/\byesterday\b|\bayer\b|\bhier\b/.test(s)) {
      var d1 = new Date(now);
      d1.setHours(0, 0, 0, 0);
      d1.setDate(d1.getDate() - 1);
      return d1;
    }
    return null;
  }

  // Decide DMY vs MDY once per chat, using four signals in decreasing strength.
  //
  // The original only had signal 1, applied to whatever subset of messages
  // happened to be passed in. In a chat where every day component is <= 12 it
  // fell straight through to locale, which silently inverts dates for anyone
  // whose WhatsApp locale differs from their browser locale.
  function __wceDetectFmt(msgs) {
    var dmy = 0;
    var mdy = 0;
    var triples = [];
    for (var i = 0; i < msgs.length; i++) {
      var t = __wceTriple(msgs[i] && msgs[i].timestamp);
      if (!t) {
        continue;
      }
      triples.push(t);
      if (t.a > 12 && t.b <= 12) {
        dmy++;
      } else if (t.b > 12 && t.a <= 12) {
        mdy++;
      }
    }
    // 1. A component above 12 cannot be a month. Conclusive.
    if (dmy > mdy) {
      return "DMY";
    }
    if (mdy > dmy) {
      return "MDY";
    }

    // 2. No message can be dated in the future. If one reading puts dates past
    //    today and the other does not, the other is correct. e.g. on 25 Aug,
    //    "05/09" read as DMY is 5 Sep, which has not happened yet.
    if (triples.length > 0) {
      var horizon = Date.now() + 172800000; // +2d absorbs timezone skew
      var future = {
        DMY: 0,
        MDY: 0
      };
      ["DMY", "MDY"].forEach(function (ord) {
        for (var k = 0; k < triples.length; k++) {
          var d = __wceMake(triples[k].a, triples[k].b, triples[k].y, ord);
          if (d && d.getTime() > horizon) {
            future[ord]++;
          }
        }
      });
      if (future.DMY === 0 && future.MDY > 0) {
        return "DMY";
      }
      if (future.MDY === 0 && future.DMY > 0) {
        return "MDY";
      }
    }

    // 3. Messages arrive oldest-first, so the correct reading is the one that
    //    yields a non-decreasing sequence.
    if (triples.length > 1) {
      var score = {
        DMY: 0,
        MDY: 0
      };
      ["DMY", "MDY"].forEach(function (ord) {
        var prev = null;
        var ok = 0;
        var bad = 0;
        for (var j = 0; j < triples.length; j++) {
          var d = __wceMake(triples[j].a, triples[j].b, triples[j].y, ord);
          if (!d) {
            bad += 2;
            continue;
          }
          if (prev !== null) {
            if (d.getTime() >= prev) {
              ok++;
            } else {
              bad++;
            }
          }
          prev = d.getTime();
        }
        score[ord] = ok - bad;
      });
      if (score.DMY > score.MDY) {
        return "DMY";
      }
      if (score.MDY > score.DMY) {
        return "MDY";
      }
    }

    // 4. Locale. Only reached when both readings are genuinely consistent with
    //    the data, in which case no signal can distinguish them.
    try {
      var lang = (navigator.language || "").toLowerCase();
      if (lang.indexOf("en-us") === 0 || lang.indexOf("en-ca") === 0) {
        return "MDY";
      }
    } catch (e) {}
    return "DMY";
  }

  // Resolve every message to a concrete epoch, recorded in __wceTsMap.
  //
  // Messages whose own timestamp string is unreadable are filled in from their
  // chronological neighbours instead of being discarded. That discard is what
  // made in-range messages disappear from exports with no error.
  function __wceResolve(msgs, fmt) {
    if (!msgs || !msgs.length) {
      return msgs;
    }
    fmt = fmt || __wceDetectFmt(msgs);
    var i;
    var m;
    var dt;
    var tod;
    for (i = 0; i < msgs.length; i++) {
      m = msgs[i];
      if (!m) {
        continue;
      }
      dt = __wceRelative(m.timestamp);
      if (!dt) {
        var t = __wceTriple(m.timestamp);
        dt = t ? __wceMake(t.a, t.b, t.y, fmt) : null;
        // If the chosen ordering yields an impossible date, the other ordering
        // is the only remaining reading -- take it rather than lose the message.
        if (!dt && t) {
          dt = __wceMake(t.a, t.b, t.y, fmt === "DMY" ? "MDY" : "DMY");
        }
      }
      if (dt) {
        tod = v459(m.timestamp || "");
        if (tod != null) {
          dt = new Date(dt.getTime());
          dt.setHours(Math.floor(tod / 60), tod % 60, 0, 0);
        }
        __wceTsMap.set(m, {
          ts: dt.getTime(),
          exact: true,
          inferred: false
        });
      } else if (m.tsMs != null) {
        // Voice/media bubbles carry no data-pre-plain-text date text, but the
        // collector already derived a day from the nearest day-divider (msg.tsMs).
        // Use it (inferred) so voice-only/media-only chats are not left date-less
        // and unsortable. The backend accepts 'inferred' timestamps.
        __wceTsMap.set(m, {
          ts: m.tsMs,
          exact: false,
          inferred: true
        });
      } else {
        __wceTsMap.set(m, {
          ts: null,
          exact: false,
          inferred: false
        });
      }
    }
    // Backward fill: an undated message is no older than the next dated one.
    var next = null;
    for (i = msgs.length - 1; i >= 0; i--) {
      if (!msgs[i]) {
        continue;
      }
      var e = __wceTsMap.get(msgs[i]);
      if (e && e.ts != null) {
        next = e.ts;
      } else if (next != null) {
        __wceTsMap.set(msgs[i], {
          ts: next,
          exact: false,
          inferred: true
        });
      }
    }
    // Forward fill for any remaining leading gap.
    var prev = null;
    for (i = 0; i < msgs.length; i++) {
      if (!msgs[i]) {
        continue;
      }
      var e2 = __wceTsMap.get(msgs[i]);
      if (e2 && e2.ts != null) {
        prev = e2.ts;
      } else if (prev != null) {
        __wceTsMap.set(msgs[i], {
          ts: prev,
          exact: false,
          inferred: true
        });
      }
    }
    return msgs;
  }

  // Wait for a DOM change, a predicate, or a deadline -- whichever is first.
  // Resolves { hit, mutated }. `mutated` separates "the pane is completely
  // inert" (we are at the top of the history) from "a spinner is up and it is
  // still fetching" -- the distinction the old fixed-budget polling could not
  // make, and the reason confirming end-of-chat used to be so slow.
  // `stopOnMutation` returns at the first sign of life, so that probe is cheap.
  function __wceAwaitMutation(el, budgetMs, predicate, stopOnMutation) {
    return new Promise(function (resolve) {
      var done = false;
      var obs = null;
      var timer = null;
      var poll = null;
      var mutated = false;
      function finish(v) {
        if (done) {
          return;
        }
        done = true;
        if (obs) {
          try {
            obs.disconnect();
          } catch (e) {}
        }
        if (timer) {
          clearTimeout(timer);
        }
        if (poll) {
          clearInterval(poll);
        }
        resolve({
          hit: v,
          mutated: mutated
        });
      }
      function check() {
        try {
          if (predicate && predicate()) {
            finish(true);
          }
        } catch (e) {}
      }
      function onMut() {
        mutated = true;
        check();
        if (stopOnMutation) {
          finish(false);
        }
      }
      try {
        obs = new MutationObserver(onMut);
        obs.observe(el, {
          childList: true,
          subtree: true
        });
      } catch (e) {
        obs = null;
      }
      // Safety net: catches attribute-only reflows, and keeps things moving if
      // the observer failed to attach at all.
      poll = setInterval(check, 120);
      timer = setTimeout(function () {
        finish(false);
      }, budgetMs);
      check();
    });
  }

  /* =================== end WCE-PATCH: helpers =================== */

  function v650(v774) {
    var v775 = v774 && v774.dayRange;
    v775 = Number(v775);
    if (isFinite(v775) && v775 > 0) {
      return v775;
    } else {
      return v773;
    }
  }
  function v776(v777) {
    var v778 = v650(v777);
    if (v778 <= 1) {
      return "last 24 hours";
    } else {
      return "last " + v778 + " days";
    }
  }
  function v779(v780, v781) {
    var v782 = v448(v780.timestamp, v781);
    if (!v782) {
      return null;
    }
    var v783 = v459(v780.timestamp);
    if (v783 != null) {
      v782 = new Date(v782.getTime());
      v782.setHours(Math.floor(v783 / 60), v783 % 60, 0, 0);
    }
    return v782;
  }
  function v784(v785, v786) {
    const v787 = {
      aoBLU: function (v788, v789, v790) {
        return v788(v789, v790);
      },
      obuzF: function (v791, v792) {
        return v791 >= v792;
      }
    };
    if (!v786) {
      return v785;
    }
    // WCE-PATCH (A1): this read `!!ts && ts >= cutoff`, so any message whose
    // timestamp string failed to parse was dropped outright -- in-range
    // messages vanishing from the export with no error anywhere. Resolve
    // against neighbours first, then compare; anything still unresolvable is
    // kept rather than lost.
    var v793 = v436(v785);
    __wceResolve(v785, v793);
    var __cut = v786.getTime();
    return v785.filter(function (v794) {
      if (!v794) {
        return false;
      }
      var t = __wceGetTs(v794);
      if (t == null) {
        return true;
      }
      return t >= __cut;
    });
  }
  function v795(v796) {
    return v784(v796, v649());
  }
  function v797(v798, v799) {
    if (!v799) {
      return false;
    }
    var v800 = v779(v798, "DMY");
    var v801 = v779(v798, "MDY");
    if (!v800 && !v801) {
      return null;
    }
    return (!v800 || v800 < v799) && (!v801 || v801 < v799);
  }
  function v802(v803, v804) {
    var v805 = v797(v803, v804);
    if (v805 === null) {
      return true;
    } else {
      return !v805;
    }
  }
  function v806(v807, v808) {
    const v809 = {
      zKaPJ: function (v810, v811) {
        return v810 !== v811;
      },
      FaaZq: "lov-wa-store",
      HvKDb: function (v812, v813) {
        return v812 < v813;
      },
      BZMtK: function (v814, v815) {
        return v814(v815);
      },
      MCqei: "message"
    };
    for (let v816 of v807) {
      let v817 = v797(v816, v808);
      if (v817 !== null) {
        return v817;
      }
    }
    return false;
  }
  // ===================== WCE-PATCH: rewritten loader =====================
  //
  // What was wrong with the original:
  //   * After each scroll it polled every 20ms for up to 650ms, and every poll
  //     rescanned and re-parsed every rendered bubble. On a long chat that is
  //     quadratic, and was the main reason exports appeared to hang. (P1/P3)
  //   * It gave up after 2 consecutive empty rounds. On a slow connection
  //     WhatsApp simply had not delivered the next page yet, so the export
  //     truncated silently -- in-range messages missing, no error. (A4)
  //   * `unshift(...batch)` re-indexed the whole array each round and passes
  //     every element as an argument, which overflows the stack outright on a
  //     large chat. (P2)
  //   * No wall-clock bound, so one pathological chat could stall a whole
  //     100-chat run indefinitely. (P4)
  //
  // How it works now:
  //   * Waiting is mutation-driven, so a round ends the moment WhatsApp
  //     renders instead of burning a fixed budget.
  //   * Waits are sized from the load latency actually observed in this chat.
  //   * A two-phase wait separates "pane is inert, we are at the top" from
  //     "pane is alive but slow", so finishing a short chat costs ~300ms
  //     instead of several seconds of escalating timeouts.
  //   * Stall recovery escalates over 5 attempts for a live-but-slow pane,
  //     which is what fixes the truncation, while an inert pane is confirmed
  //     in 2 quick rounds.
  //   * Append-then-reverse instead of unshift, and a per-chat wall clock.
  async function v818(v819, v820, v821 = false, v822) {
    __wceResetFmt();
    let v823 = v713();
    if (!v823) {
      return v752().map(v824 => v824.message);
    }
    let seen = new Set(); // dedupe keys across rounds
    let olderPages = []; // pages loaded by scrolling up, newest page last
    let initial = []; // what was on screen when we started
    let mediaQueue = [];
    let startedAt = Date.now();

    // Per-chat ceiling. Hitting it ends this chat cleanly with whatever was
    // collected, rather than blocking every chat queued behind it.
    const CHAT_BUDGET_MS = 90000;
    const budgetExceeded = () => Date.now() - startedAt > CHAT_BUDGET_MS;

    // Append without spreading: `push(...arr)` passes every element as an
    // argument, which is exactly the overflow the original unshift hit.
    const appendAll = (dst, srcArr) => {
      for (let i = 0; i < srcArr.length; i++) {
        dst.push(srcArr[i]);
      }
      return dst;
    };
    const collect = prepend => {
      let fresh = [];
      for (let entry of v752()) {
        if (seen.has(entry.key)) {
          continue;
        }
        seen.add(entry.key);
        let msg = entry.message;
        if ((msg.media === "voice" || msg.media === "audio") && entry.key && String(entry.key).length <= 200 && !String(entry.key).includes("|")) {
          msg.sourceMessageId = String(entry.key);
        }
        if (v821 && v802(msg, v822)) {
          mediaQueue.push({
            m: msg,
            k: entry.key
          });
        }
        fresh.push(msg);
      }
      if (fresh.length > 0) {
        if (prepend) {
          olderPages.push(fresh); // reversed on the way out
        } else {
          appendAll(initial, fresh);
        }
      }
      v819(seen.size);
      return fresh.length;
    };

    // Oldest history first, then whatever was initially on screen.
    const assemble = () => {
      let out = [];
      for (let p = olderPages.length - 1; p >= 0; p--) {
        appendAll(out, olderPages[p]);
      }
      appendAll(out, initial);
      return out;
    };

    // The cutoff check only ever needs the oldest messages, which live in the
    // most recently loaded page. Rebuilding the whole array each iteration just
    // to inspect its head would put the quadratic cost straight back in.
    const oldestSlice = () => olderPages.length > 0 ? olderPages[olderPages.length - 1] : initial;
    const fireScroll = () => {
      v823.dispatchEvent(new Event("scroll", {
        bubbles: true
      }));
    };

    // Load latency observed in this chat, used to size every wait. A chat
    // delivering pages in 50ms does not need a multi-second budget to confirm
    // it has reached the top; a genuinely slow one still gets a generous one.
    let maxLoadMs = 120;
    const budget = (mult, lo, hi) => Math.max(lo, Math.min(hi, Math.round(maxLoadMs * mult)));

    // Two-phase wait.
    //   Phase A: give the pane a short window to show ANY activity. WhatsApp
    //     renders its spinner within a frame or two of a scroll that will
    //     fetch history, so silence here means we are at the top -- and we can
    //     say so in ~300ms rather than waiting out a content-sized budget.
    //     This is what makes short chats cheap.
    //   Phase B: only once the pane has stirred do we spend the larger budget
    //     waiting for messages to actually land.
    const awaitNew = async contentBudgetMs => {
      let got = collect(true);
      if (got > 0) {
        return {
          count: got,
          mutated: true
        };
      }
      let baseline = v685().length;
      let baseH = v823.scrollHeight;
      const arrived = () => v685().length !== baseline || v823.scrollHeight !== baseH;
      let t0 = Date.now();
      let a = await __wceAwaitMutation(v823, budget(2.5, 250, 1000), arrived, true);
      let count = collect(true);
      if (count > 0) {
        let took = Date.now() - t0;
        if (took > maxLoadMs) {
          maxLoadMs = Math.min(took, 5000);
        }
        return {
          count: count,
          mutated: true
        };
      }
      if (!a.mutated) {
        return {
          count: 0,
          mutated: false
        };
      } // inert -> at top

      let spent = Date.now() - t0;
      let remaining = Math.max(200, contentBudgetMs - spent);
      await __wceAwaitMutation(v823, remaining, arrived, false);
      count = collect(true);
      if (count > 0) {
        let took = Date.now() - t0;
        if (took > maxLoadMs) {
          maxLoadMs = Math.min(took, 5000);
        }
      }
      return {
        count: count,
        mutated: true
      };
    };

    // Prime: jump to the bottom and wait for the first render.
    v823.scrollTop = v823.scrollHeight;
    fireScroll();
    await __wceAwaitMutation(v823, 4000, () => v685().length > 0, false);
    collect(false);
    let reachedCutoff = !!v822 && !!v806(oldestSlice(), v822);
    let softStalls = 0; // pane reacted but produced nothing -> still loading
    let hardStalls = 0; // pane completely inert -> top of history

    for (let i = 0; i < v551 && !reachedCutoff && !v820(); i++) {
      if (budgetExceeded()) {
        break;
      }
      v823.scrollTop = 0;
      fireScroll();
      let r = await awaitNew(budget(6, 300, 2500));
      if (v822 && v806(oldestSlice(), v822)) {
        reachedCutoff = true;
        break;
      }
      if (r.count > 0) {
        softStalls = 0;
        hardStalls = 0;
        continue;
      }

      // Nothing new. If the pane never mutated, WhatsApp did not even render a
      // spinner, so there is no more history -- confirm once and stop, rather
      // than waiting out several escalating budgets for a chat that has ended.
      if (!r.mutated) {
        hardStalls++;
        if (hardStalls >= 2) {
          break;
        }
      } else {
        // Alive but slow: keep escalating. 5 attempts, not 2 -- this is the
        // truncation fix.
        softStalls++;
        if (softStalls >= 5) {
          break;
        }
      }
      let attempt = softStalls + hardStalls;
      v823.scrollTop = 24 + attempt * 8;
      fireScroll();
      await v547(60);
      v823.scrollTop = 0;
      fireScroll();

      // After an inert round the only question is "is it really inert?", which
      // resolves fast. Escalating budgets are for a demonstrably live pane.
      let r2 = await awaitNew(r.mutated ? budget(8 + attempt * 4, 400, 4000) : budget(3, 300, 1000));
      if (r2.count > 0) {
        softStalls = 0;
        hardStalls = 0;
        if (v822 && v806(oldestSlice(), v822)) {
          reachedCutoff = true;
          break;
        }
      } else if (!r2.mutated) {
        hardStalls++;
        if (hardStalls >= 2) {
          break;
        }
      }
    }

    // Final sweep: pick up anything rendered during the last wait.
    collect(true);
    if (v821 && mediaQueue.length > 0 && !v820()) {
      let cursor = 0;
      let worker = async () => {
        while (true) {
          let idx = cursor++;
          if (idx >= mediaQueue.length || v820()) {
            return;
          }
          let msg = mediaQueue[idx].m;
          if (msg.mediaUrl) {
            msg.mediaData = await v766(msg.mediaUrl).catch(() => undefined);
          } else if (msg.media === "voice") {
            msg.mediaData = await (window.__lovDlAudio__ ? window.__lovDlAudio__(mediaQueue[idx].k) : Promise.resolve()).catch(() => undefined);
          }
        }
      };
      await Promise.all(Array.from({
        length: Math.min(6, mediaQueue.length)
      }, worker));
    }
    v823.scrollTop = v823.scrollHeight;
    return assemble();
  }
  // =================== end WCE-PATCH: rewritten loader ===================

  // CSR v4.8: mixed WhatsApp message DOM support. Newer voice bubbles can
  // have msg-container only, even in a chat where text bubbles still use
  // message-in/message-out. The old all-or-nothing fallback missed those voices.
  // CSR v4.9: Inspect mixed DOM message wrappers AND message-local call events.
  // In v4.5 the broad call sweep was removed to prevent group-header false
  // positives, but genuine event-only rows also disappeared. The second pass
  // now stays inside the active conversation and requires a real call event.
  function v685() {
    var root = v709() ?? document;
    var raw = Array.from(root.querySelectorAll("div.message-in, div.message-out, div[data-id][data-testid^='conv-msg-'], div[data-testid^='conv-msg-'], [data-testid='msg-container'], [data-testid='call-event'], [data-testid='call-log-message'], [data-testid='call-message']"));
    // Do not scan the whole WhatsApp page, group header or Calls tab.
    // Include genuine call rows that lack the usual message-in/out selectors.
    var candidateRows = root.querySelectorAll("[role='row'], [data-testid*='call-event'], [data-testid*='call-log'], div[data-id]");
    for (var c = 0; c < candidateRows.length && c < 1500; c++) {
      var candidate = candidateRows[c];
      if (typeof __lovIsCallRow === "function" && __lovIsCallRow(candidate)) {
        raw.push(candidate);
      }
    }
    function canonical(node) {
      if (!node || !node.closest) {
        return node;
      }
      var bubble = node.closest(".message-in, .message-out, [data-testid^=\"conv-msg-\"]");
      if (bubble) {
        return bubble.closest(".message-in, .message-out") || bubble;
      }
      var p = node;
      for (var depth = 0; depth < 8 && p; depth++, p = p.parentElement) {
        if (p === root || p.id === "main" || p.classList?.contains("copyable-area")) {
          break;
        }
        var id = p.getAttribute?.("data-id") || String(p.getAttribute?.("data-testid") || "").replace(/^conv-msg-/, "");
        if (/^(?:true|false)_[^\s|]{6,}$/i.test(id)) {
          return p;
        }
      }
      return node;
    }
    var seenIds = new Set();
    var seenNodes = new Set();
    var result = [];
    for (var i = 0; i < raw.length; i++) {
      var node = canonical(raw[i]);
      if (!node || seenNodes.has(node)) {
        continue;
      }
      var id = __csrTrustedMessageId(node);
      if (id && seenIds.has(id)) {
        continue;
      }
      var ancestor = node.parentElement;
      var nested = false;
      for (var depth = 0; depth < 8 && ancestor; depth++, ancestor = ancestor.parentElement) {
        if (seenNodes.has(ancestor)) {
          nested = true;
          break;
        }
        if (ancestor === root) {
          break;
        }
      }
      if (!id && nested) {
        continue;
      }
      seenNodes.add(node);
      if (id) {
        seenIds.add(id);
      }
      result.push(node);
    }
    // Mixed native wrappers and event-only rows must be processed in DOM order
    // so neighboring day dividers supply the correct timestamp context.
    try {
      result.sort(function (a, b) {
        if (a === b) {
          return 0;
        }
        var rel = a.compareDocumentPosition(b);
        if (rel & 4) {
          return -1;
        }
        if (rel & 2) {
          return 1;
        }
        return 0;
      });
    } catch (_) {}
    return result;
  }
  function v825(v826) {
    const v827 = {
      QUyQK: function (v828) {
        return v828();
      }
    };
    return v826.querySelector("[data-pre-plain-text]") ?? v826.closest("[data-pre-plain-text]") ?? null;
  }
  function v760(v829) {
    let v830 = v825(v829)?.getAttribute("data-pre-plain-text") ?? "";
    let v831 = v830.match(/^\[(.+?)\]\s*(.*?):\s*$/);
    if (v831) {
      return {
        timestamp: v831[1].trim(),
        sender: v831[2].trim()
      };
    }
    let v832 = v830.match(/^\[(.+?)\]/);
    return {
      timestamp: v832 ? v832[1].trim() : "",
      sender: ""
    };
  }
  function v762(v833) {
    if (v833.querySelector("[data-icon=\"media-cancel\"], [aria-label*=\"This message was deleted\"]")) {
      return "deleted";
    }
    if (v833.querySelector("[data-icon=\"audio-play\"], [data-icon=\"ptt-status\"], audio, button[aria-label=\"Play voice message\"], span[aria-label=\"Voice message\"], div[aria-label=\"Voice note progress slider\"]")) {
      return "voice";
    }
    if (v833.querySelector("img[src^='blob:'], img[src^='data:'], [data-icon='media-download'] + img, [aria-label*='Photo']")) {
      return "image";
    }
    if (v833.querySelector("video, [aria-label*='Video']")) {
      return "video";
    }
    if (v833.querySelector("[data-icon=\"sticker\"], [aria-label*=\"Sticker\"]")) {
      return "sticker";
    }
    if (v833.querySelector("[data-icon=\"document\"], [data-icon=\"doc\"], [aria-label*=\"Document\"]")) {
      return "document";
    }
    if (v833.querySelector("[data-icon=\"poll\"], [aria-label*=\"Poll\"]")) {
      return "poll";
    }
    if (v833.querySelector("[data-icon=\"location\"], [aria-label*=\"Location\"]")) {
      return "location";
    }
    if (v833.querySelector("[data-icon=\"contact\"], [aria-label*=\"Contact card\"]")) {
      return "contact";
    }
  }
  function v764(v834) {
    let v835 = Array.from(v834.querySelectorAll(".copyable-text span.selectable-text, span.selectable-text, .selectable-text.copyable-text"));
    if (v835.length > 0) {
      let v836 = v835.map(v837 => (v837.innerText ?? v837.textContent ?? "").trim()).filter(v838 => v838.length > 0);
      if (v836.length > 0) {
        return v836.sort((v839, v840) => v840.length - v839.length)[0];
      }
    }
    return "";
  }
  function v756(v841) {
    // Current WhatsApp messages no longer always have message-in/message-out
    // or data-pre-plain-text. A conv-msg/msg-container is still a real message,
    // not a system row.
    if (v841.classList.contains("message-in") || v841.classList.contains("message-out")) {
      return false;
    }
    if (v841.matches?.("[data-testid^='conv-msg-']") || v841.querySelector?.("[data-testid='msg-container']")) {
      return false;
    }
    return !v825(v841);
  }
  function v842() {
    let v843 = [];
    let v844 = new Set();
    for (let v845 of v752()) {
      if (!v844.has(v845.key)) {
        v844.add(v845.key);
        v843.push(v845.message);
      }
    }
    return v843;
  }
  async function v846(v847, v848 = false, v849) {
    await v552(() => v685().length > 0 ? true : v686(), {
      timeout: 20000
    });
    let v850 = v679();
    const v851 = {
      phase: "loading",
      currentTitle: v850,
      messagesProcessed: 0
    };
    v847.emit(v851);
    let v852 = await v818(v853 => v847.emit({
      phase: "loading",
      currentTitle: v850,
      messagesProcessed: v853
    }), v847.shouldCancel, v848, v849);
    const v854 = {
      phase: "parsing",
      currentTitle: v850
    };
    v847.emit(v854);
    let v855 = v852.length > 0 ? v852 : v842();
    const v856 = {
      phase: "parsing",
      currentTitle: v850,
      messagesProcessed: v855.length
    };
    v847.emit(v856);
    return {
      title: v850,
      messages: v855
    };
  }
  async function v857(v858, v859, v860 = false, v861) {
    let v862 = [];
    let v863 = [];
    for (let v864 = 0; v864 < v858.length && !v859.shouldCancel(); v864++) {
      const v865 = {
        phase: "scanning",
        currentIndex: v864,
        currentTitle: v858[v864],
        totalChats: v858.length
      };
      v859.emit(v865);
      let v866 = null;
      let v867 = null;
      for (let v868 = 0; v868 < 2 && !v859.shouldCancel(); v868++) {
        try {
          await v665(v858[v864]);
          v867 = await v869({
            emit: v870 => v859.emit({
              ...v870,
              currentIndex: v864,
              totalChats: v858.length
            }),
            shouldCancel: v859.shouldCancel
          }, v860, v861, v858[v864]);
          v866 = null;
          break;
        } catch (v871) {
          v866 = v871 instanceof Error ? v871.message : String(v871);
          v867 = null;
          await v547(250);
        }
      }
      if (v867) {
        const v872 = {
          ...v867
        };
        v872.reqId = v858[v864];
        v862.push(v872);
      } else {
        const v873 = {
          id: v858[v864],
          title: v858[v864],
          error: v866 || "Could not read this chat"
        };
        v863.push(v873);
        const v874 = {
          phase: "skipped",
          currentIndex: v864,
          currentTitle: v858[v864],
          totalChats: v858.length
        };
        v859.emit(v874);
      }
    }
    v862.skipped = v863;
    return v862;
  }
  function v875(v876, v877 = "chat") {
    return (v876.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/\.+$/, "") || v877).slice(0, 120);
  }
  function v878() {
    const v879 = {
      WWjWA: function (v880, v881) {
        return v880 + v881;
      }
    };
    let v882 = new Map();
    return v883 => {
      let v884 = v882.get(v883) ?? 0;
      v882.set(v883, v879.WWjWA(v884, 1));
      if (v884 === 0) {
        return v883;
      } else {
        return v883 + " (" + v884 + ")";
      }
    };
  }
  function v885(v886, v887, v888) {
    const v889 = {
      type: "DOWNLOAD",
      filename: v886,
      text: v887,
      mime: v888
    };
    return v890(v889);
  }
  function v891(v892, v893) {
    const v894 = {
      tipiI: function (v895, v896) {
        return v895(v896);
      },
      ICNKs: function (v897, v898) {
        return v897 > v898;
      },
      AVxpH: function (v899, v900) {
        return v899 + v900;
      },
      HTYQE: function (v901, v902) {
        return v901 > v902;
      },
      zHrqu: function (v903) {
        return v903();
      },
      pATGb: function (v904, v905) {
        return v904 > v905;
      }
    };
    const v906 = {
      type: "DOWNLOAD",
      filename: v892,
      dataUrl: v893
    };
    return v890(v906);
  }
  function v890(v907) {
    const v908 = {
      FhuSb: function (v909, v910) {
        return v909(v910);
      },
      Ttrky: function (v911) {
        return v911();
      }
    };
    return new Promise((v912, v913) => {
      chrome.runtime.sendMessage(v907, v914 => {
        let v915 = chrome.runtime.lastError;
        if (v915) {
          return v908.FhuSb(v913, Error(v915.message));
        }
        if (v914?.ok) {
          v908.Ttrky(v912);
        } else {
          v908.FhuSb(v913, v908.FhuSb(Error, v914?.error ?? "Download failed"));
        }
      });
    });
  }
  function v916(v917) {
    if (v917.format === "html") {
      return "html";
    } else {
      return "txt";
    }
  }
  function v918(v919) {
    if (v919.format === "html") {
      return "text/html";
    } else {
      return "text/plain";
    }
  }
  function v920(v921, v922) {
    if (v922.format === "html") {
      return v536(v921, v922);
    } else {
      return v492(v921, v922);
    }
  }
  function __wceGetUnreadSummary() {
    if (Array.isArray(window.__wceLastUnreadSummary)) {
      return window.__wceLastUnreadSummary;
    } else {
      return [];
    }
  }
  function __wceUnreadTextBlock() {
    var list = __wceGetUnreadSummary();
    var lines = ["UNREAD CHATS SKIPPED: " + list.length];
    if (list.length) {
      lines.push("");
      for (var i = 0; i < list.length; i++) {
        lines.push(i + 1 + ". " + list[i]);
      }
    }
    lines.push("", v498, "");
    return lines.join("\n");
  }
  function __wceUnreadHtmlBlock() {
    var list = __wceGetUnreadSummary();
    var items = list.map(function (item) {
      return "<li>" + v517(String(item)) + "</li>";
    }).join("");
    return "<section style=\"margin:0 0 18px;padding:12px 14px;border-radius:8px;background:#fff3cd;color:#111;\"><strong>Unread chats skipped: " + list.length + "</strong>" + (list.length ? "<ol style=\"margin:8px 0 0 20px;padding:0;\">" + items + "</ol>" : "") + "</section>";
  }
  function v923(v924, v925) {
    if (v925.format === "html") {
      var html = v543(v924, v925);
      return html.replace("<main>\n", "<main>\n" + __wceUnreadHtmlBlock() + "\n");
    }
    return __wceUnreadTextBlock() + v499(v924, v925);
  }
  function v926(v927) {
    let v928 = v927.slice(5, v927.indexOf(";"));
    return {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/wav": "wav"
    }[v928] ?? (v928.split("/")[1] || "bin");
  }
  async function v929(v930, v931) {
    let v932 = v472(v930.messages, v931).filter(v933 => !!v933.mediaData);
    if (v932.length === 0) {
      return 0;
    }
    let v934 = v875(v930.title) || "chat";
    let v935 = 0;
    for (let v936 = 0; v936 < v932.length; v936++) {
      let v937 = v932[v936];
      let v938 = v926(v937.mediaData);
      let v939 = v934 + "/" + String(v936 + 1).padStart(4, "0") + "-" + (v937.media ?? "media") + "." + v938;
      try {
        await v891(v939, v937.mediaData);
        v935 += 1;
      } catch {}
    }
    return v935;
  }
  async function v940(v941, v942) {
    let v943 = v472(v941.messages, v942).filter(v944 => !!v944.mediaData && (v944.media === "audio" || v944.media === "voice"));
    if (v943.length === 0) {
      return 0;
    }
    let v945 = v875(v941.title) || "chat";
    let v946 = 0;
    for (let v947 = 0; v947 < v943.length; v947++) {
      let v948 = v943[v947];
      let v949 = v926(v948.mediaData);
      let v950 = v945 + "/audio/" + String(v947 + 1).padStart(4, "0") + "-" + (v948.media ?? "audio") + "." + v949;
      try {
        await v891(v950, v948.mediaData);
        v946 += 1;
      } catch {}
    }
    return v946;
  }
  async function v951(v952, v953) {
    const v954 = {
      xNquc: function (v955, v956) {
        return v955(v956);
      }
    };
    let v957 = v878();
    let v958 = v916(v953);
    let v959 = v918(v953);
    let v960 = 0;
    for (let v961 of v952) {
      let v962 = v920(v961, v953);
      await v885(v957(v875(v961.title)) + "." + v958, v962, v959);
      if (v953.exportMedia) {
        await v929(v961, v953);
      }
      if (v953.exportAudio) {
        await v940(v961, v953);
      }
      v960 += 1;
    }
    return v960;
  }
  async function v963(v964, v965, v966 = "whatsapp-export-combined") {
    let v967 = v923(v964, v965);
    let v968 = v916(v965);
    await v885(v875(v966) + "." + v968, v967, v918(v965));
    if (v965.exportMedia) {
      for (let v969 of v964) {
        await v929(v969, v965);
      }
    }
    if (v965.exportAudio) {
      for (let v970 of v964) {
        await v940(v970, v965);
      }
    }
  }
  var v971 = false;
  function v649(v972) {
    let v973 = v650(v972);
    // WCE-PATCH (A2): this used a rolling 24h window for dayRange <= 1 but a
    // midnight-aligned one for anything larger, so "last 7 days" actually
    // returned up to 8 calendar days. One rolling window for every range now,
    // matching the "last N days" wording the UI shows.
    return new Date(Date.now() - v973 * 86400000);
  }
  function v974(v975) {
    const v976 = {
      type: "PROGRESS",
      progress: v975
    };
    let v977 = v976;
    chrome.runtime.sendMessage(v977).catch(() => undefined);
  }
  function v978(v979) {
    return {
      emit: v980 => v974({
        totalChats: 1,
        currentIndex: 0,
        currentTitle: "",
        messagesProcessed: 0,
        ...v979,
        ...v980
      }),
      shouldCancel: () => v971
    };
  }
  chrome.runtime.onMessage.addListener((v981, v982, v983) => {
    (async () => {
      const v984 = {
        VjvPr: function (v985, v986) {
          return v985 === v986;
        },
        fZfki: "BBzgH",
        UnGVH: function (v987, v988) {
          return v987(v988);
        },
        VFhxf: function (v989) {
          return v989();
        }
      };
      try {
        switch (v981.type) {
          case "CSR_FETCH_VOICE":
            {
              const sourceId = String(v981.sourceMessageId || "");
              if (!sourceId || sourceId.length > 500) {
                throw new Error("Voice source ID missing");
              }
              if (typeof window.__lovDlAudio__ !== "function") {
                throw new Error("WhatsApp voice resolver unavailable");
              }
              const dataUrl = await window.__lovDlAudio__(sourceId);
              if (typeof dataUrl !== "string" || !/^data:audio\/(?:ogg|mpeg|mp3|mp4|webm|wav|x-wav)(?:;\s*codecs\s*=\s*\"?[a-z0-9._+-]+\"?)?;base64,/i.test(dataUrl)) {
                throw new Error("WhatsApp did not provide playable audio");
              }
              if (dataUrl.length > 5600000) {
                throw new Error("Voice exceeds the 4 MiB upload limit");
              }
              v983({
                ok: true,
                dataUrl
              });
              return;
            }
          case "PING":
            v983({
              ok: true,
              type: "PONG"
            });
            return;
          case "GET_CHATS":
            {
              const __wceDays = Number(v981.dayRange);
              const __wceChats = await v651(Number.isFinite(__wceDays) && __wceDays > 0 ? {
                dayRange: Math.min(730, Math.ceil(__wceDays))
              } : undefined);
              const __wceUnreadChats = Array.from(__wceChats && __wceChats.__wceUnreadSummary || window.__wceLastUnreadSummary || []);
              v983({
                ok: true,
                type: "CHATS",
                chats: __wceChats,
                unreadCount: __wceUnreadChats.length,
                unreadChats: __wceUnreadChats
              });
              return;
            }
          case "SCRAPE_CURRENT":
            {
              v971 = false;
              let v990 = await v869(v978({
                totalChats: 1
              }));
              const v991 = {
                totalChats: 1,
                currentIndex: 0,
                currentTitle: v990.title,
                messagesProcessed: v990.messages.length,
                phase: "done"
              };
              v974(v991);
              v983({
                ok: true,
                type: "SCRAPED",
                chats: [v990]
              });
              return;
            }
          case "SCRAPE_CHATS":
            {
              v971 = false;
              let v992 = await v857(v981.ids, v978({
                totalChats: v981.ids.length
              }), false, Number.isFinite(Number(v981.cutoffMs)) && Number(v981.cutoffMs) > 946684800000 ? new Date(Number(v981.cutoffMs)) : v981.windowHours === 25 ? new Date(Date.now() - 90000000) : undefined);
              v974({
                totalChats: v981.ids.length,
                currentIndex: v981.ids.length,
                currentTitle: "",
                messagesProcessed: v992.reduce((v993, v994) => v993 + v994.messages.length, 0),
                phase: v971 ? "cancelled" : "done"
              });
              v983({
                ok: true,
                type: "SCRAPED",
                chats: v992.map(function (chat) {
                  const msgs = chat.messages || [];
                  __wceResolve(msgs, __wceDetectFmt(msgs));
                  return {
                    ...chat,
                    messages: msgs.map(function (m) {
                      const entry = __wceTsMap.get(m);
                      return {
                        ...m,
                        timestampMs: entry && entry.ts != null ? entry.ts : null,
                        timestampQuality: entry ? entry.exact ? "exact" : entry.inferred ? "inferred" : "unknown" : "unknown"
                      };
                    })
                  };
                }),
                skipped: v992.skipped || []
              });
              return;
            }
          case "EXPORT_CURRENT":
            {
              v971 = false;
              let v995 = !!v981.options.exportMedia || !!v981.options.exportAudio;
              let v996 = v772.get(v637(v679()));
              let v997 = v649(v981.options);
              let v998;
              if (v996 && Date.now() - v996.cachedAt < 900000 && (v996.hasMedia || !v995) && v996.cutoff != null && v996.cutoff <= v997.getTime()) {
                v998 = {
                  title: v996.title,
                  messages: v784(v996.messages, v997)
                };
                const v999 = {
                  totalChats: 1,
                  currentIndex: 1,
                  currentTitle: v998.title,
                  messagesProcessed: v998.messages.length,
                  phase: "done"
                };
                v974(v999);
              } else {
                v998 = await v869(v978({
                  totalChats: 1
                }), v981.options.exportMedia || v981.options.exportAudio, v997);
              }
              if (!v998.messages || v998.messages.length === 0) {
                const v1000 = {
                  totalChats: 1,
                  currentIndex: 1,
                  currentTitle: v998.title,
                  messagesProcessed: 0,
                  phase: v971 ? "cancelled" : "done"
                };
                v974(v1000);
                v983({
                  ok: true,
                  type: "EXPORTED",
                  summary: "\"" + v998.title + "\" has no messages in the " + v776(v981.options) + " â€” nothing exported."
                });
                return;
              }
              await v951([v998], v981.options);
              const v1001 = {
                totalChats: 1,
                currentIndex: 1,
                currentTitle: v998.title,
                messagesProcessed: v998.messages.length,
                phase: v971 ? "cancelled" : "done"
              };
              v974(v1001);
              const v1002 = {
                ok: true,
                type: "EXPORTED",
                summary: "Done successfully â€” exported \"" + v998.title + "\" (" + v998.messages.length + " messages)."
              };
              v983(v1002);
              return;
            }
          case "EXPORT_CHATS":
            {
              v971 = false;
              let v1003 = !!v981.options.exportMedia || !!v981.options.exportAudio;
              let v1004 = 900000;
              let v1005 = [];
              let v1006 = [];
              let v1007 = v649(v981.options);
              let v1008 = v1007.getTime();
              for (let v1009 of v981.ids) {
                let v1010 = v772.get(v637(v1009));
                if (v1010 && Date.now() - v1010.cachedAt < v1004 && (v1010.hasMedia || !v1003) && v1010.cutoff != null && v1010.cutoff <= v1008) {
                  v1006.push({
                    id: v1009,
                    title: v1010.title,
                    messages: v784(v1010.messages, v1007)
                  });
                } else {
                  v1005.push(v1009);
                }
              }
              const v1011 = {
                totalChats: v981.ids.length,
                currentIndex: v1006.length
              };
              let v1012 = v1005.length > 0 ? await v857(v1005, v978(v1011), v1003, v1007) : [];
              let v1013 = v1012.skipped || [];
              let v1014 = Array.prototype.slice.call(v1012);
              let v1015 = new Array(v1014.length).fill(false);
              let v1016 = v1017 => {
                for (let v1018 = 0; v1018 < v1014.length; v1018++) {
                  if (!v1015[v1018] && v1014[v1018].reqId === v1017) {
                    v1015[v1018] = true;
                    return v1014[v1018];
                  }
                }
                let v1019 = v637(v1017);
                for (let v1020 = 0; v1020 < v1014.length; v1020++) {
                  if (!v1015[v1020] && v637(v1014[v1020].title) === v1019) {
                    v1015[v1020] = true;
                    return v1014[v1020];
                  }
                }
                return null;
              };
              let v1021 = [];
              let v1022 = [];
              for (let v1023 of v981.ids) {
                let v1024 = v1006.find(v1025 => v1025.id === v1023);
                if (v1024) {
                  const v1026 = {
                    title: v1024.title || v1023,
                    messages: v1024.messages || []
                  };
                  v1021.push(v1026);
                  continue;
                }
                let v1027 = v1016(v1023);
                if (v1027) {
                  const v1028 = {
                    title: v1027.title || v1023,
                    messages: v1027.messages || []
                  };
                  v1021.push(v1028);
                } else if (!v1013.some(v1029 => v1029.id === v1023)) {
                  v1022.push(v1023);
                }
              }
              for (let v1030 = 0; v1030 < v1014.length; v1030++) {
                if (!v1015[v1030] && v1014[v1030].messages && v1014[v1030].messages.length > 0) {
                  v1015[v1030] = true;
                  v1021.push({
                    title: v1014[v1030].title || v1014[v1030].reqId || "Chat",
                    messages: v1014[v1030].messages
                  });
                }
              }
              let v1031 = v1021.filter(v1032 => !v1032.messages || v1032.messages.length === 0);
              v1021 = v1021.filter(v1033 => v1033.messages && v1033.messages.length > 0);
              let v1034 = v1021.reduce((v1035, v1036) => v1035 + v1036.messages.length, 0);
              if (v1021.length > 0) {
                if (v981.mode === "combined") {
                  await v963(v1021, v981.options);
                } else {
                  await v951(v1021, v981.options);
                }
              }
              const v1037 = {
                totalChats: v981.ids.length,
                currentIndex: v1021.length,
                currentTitle: "",
                messagesProcessed: v1034,
                phase: v971 ? "cancelled" : "done"
              };
              v974(v1037);
              let v1038 = v1013.length > 0 ? " Skipped " + v1013.length + " chat" + (v1013.length > 1 ? "s" : "") + " that couldn't be opened (" + v1013.map(v1039 => v1039.title).join(", ") + ")." : "";
              let v1040 = v1006.length > 0 ? " (" + v1006.length + " loaded instantly from cache.)" : "";
              let v1041 = v1031.length > 0 ? " Skipped " + v1031.length + " chat" + (v1031.length > 1 ? "s" : "") + " with no messages in the " + v776(v981.options) + "." : "";
              let v1042 = v1022.length > 0 ? " Could not read " + v1022.length + " chat" + (v1022.length > 1 ? "s" : "") + " (" + v1022.join(", ") + ") â€” try again with WhatsApp Web in the foreground." : "";
              v983({
                ok: true,
                type: "EXPORTED",
                summary: (v1021.length === 0 ? "No chats had messages in the " + v776(v981.options) + " â€” nothing exported." : v981.mode === "combined" ? "Done successfully â€” exported " + v1021.length + " chat" + (v1021.length > 1 ? "s" : "") + " (" + v1034 + " messages) into one combined file." : "Done successfully â€” exported " + v1021.length + " chat" + (v1021.length > 1 ? "s" : "") + " (" + v1034 + " messages) as separate files.") + v1040 + v1041 + v1042 + v1038,
                skipped: v1013
              });
              return;
            }
          case "PRELOAD_CHATS":
            {
              v971 = false;
              let v1043 = !!v981.options && (!!v981.options.exportMedia || !!v981.options.exportAudio);
              let v1044 = v981.ids && v981.ids.length ? v981.ids : (await v651()).map(v1045 => v1045.id);
              let v1046 = v649(v981.options);
              let v1047 = v1046.getTime();
              let v1048 = 0;
              let v1049 = v1044.length;
              let v1050 = [];
              for (let v1051 = 0; v1051 < v1044.length && !v971; v1051++) {
                let v1052 = v1044[v1051];
                let v1053 = v772.get(v637(v1052));
                if (v1053 && Date.now() - v1053.cachedAt < 900000 && (v1053.hasMedia || !v1043) && v1053.cutoff != null && v1053.cutoff <= v1047) {
                  v1048 += 1;
                  const v1054 = {
                    totalChats: v1049,
                    currentIndex: v1051,
                    currentTitle: v1052,
                    messagesProcessed: v1048,
                    phase: "loading"
                  };
                  v974(v1054);
                  continue;
                }
                try {
                  await v665(v1052);
                  const v1055 = {
                    totalChats: v1049,
                    currentIndex: v1051
                  };
                  await v869(v978(v1055), v1043, v1046, v1052);
                  v1048 += 1;
                } catch (v1056) {
                  v1050.push({
                    id: v1052,
                    title: v1052,
                    error: v1056 instanceof Error ? v1056.message : String(v1056)
                  });
                }
                const v1057 = {
                  totalChats: v1049,
                  currentIndex: v1051,
                  currentTitle: v1052,
                  messagesProcessed: v1048,
                  phase: "loading"
                };
                v974(v1057);
              }
              const v1058 = {
                totalChats: v1049,
                currentIndex: v1049,
                currentTitle: "",
                messagesProcessed: v1048,
                phase: v971 ? "cancelled" : "done"
              };
              v974(v1058);
              v983({
                ok: true,
                type: "EXPORTED",
                summary: "Preloaded " + v1048 + " of " + v1049 + " chat" + (v1049 === 1 ? "" : "s") + " (" + (v650(v981.options) <= 1 ? "last 24 hours" : "last " + v650(v981.options) + " days") + "). Export will now be instant for these." + (v1050.length ? " Skipped " + v1050.length + "." : ""),
                skipped: v1050
              });
              return;
            }
          case "CANCEL":
            v971 = true;
            v983({
              ok: true,
              type: "PONG"
            });
            return;
        }
      } catch (v1059) {
        v983({
          ok: false,
          error: v1059 instanceof Error ? v1059.message : String(v1059)
        });
      }
    })();
    return true;
  });
  (function () {
    const v1060 = {
      rZJuS: function (v1061, v1062) {
        return v1061(v1062);
      },
      sYtHC: function (v1063, v1064) {
        return v1063 instanceof v1064;
      }
    };
    function v1065(v1066) {
      const v1067 = {
        qHrEi: function (v1068, v1069) {
          return v1068 === v1069;
        }
      };
      const v1070 = v1067;
      try {
        var v1071 = v1066.innerText || v1066.textContent || "";
        var v1072 = v1071.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (v1072) {
          return v1072[1];
        }
      } catch (v1073) {}
      return undefined;
    }
    window.__lovDur__ = v1065;
  })();
  var __LOV_WIN__ = null;
  var __LOV_SKEW__ = 120000;
  function __lovWindowFor(__lovOpts) {
    var n = v650(__lovOpts);
    var end = Date.now() + __LOV_SKEW__;
    var start;
    if (n <= 1) {
      start = Date.now() - 86400000;
    } else {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (n - 1));
      start = d.getTime();
    }
    return {
      start: start,
      end: end,
      days: n
    };
  }
  v649 = function (__lovOpts) {
    var w = __lovWindowFor(__lovOpts);
    __LOV_WIN__ = w;
    return new Date(w.start);
  };
  function __lovEndFor(startMs) {
    if (__LOV_WIN__ && Math.abs(__LOV_WIN__.start - startMs) < 1000) {
      return __LOV_WIN__.end;
    }
    return Date.now() + __LOV_SKEW__;
  }
  function __lovParseDurationText(t) {
    if (!t) {
      return null;
    }
    t = String(t).trim();
    var m = t.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);
    if (m) {
      if (m[3] !== undefined) {
        return +m[1] * 3600 + +m[2] * 60 + +m[3];
      } else {
        return +m[1] * 60 + +m[2];
      }
    }
    var secs = 0;
    var hit = false;
    var r;
    if (r = t.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i)) {
      secs += +r[1] * 3600;
      hit = true;
    }
    if (r = t.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i)) {
      secs += +r[1] * 60;
      hit = true;
    }
    if (r = t.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/i)) {
      secs += +r[1];
      hit = true;
    }
    if (hit) {
      return secs;
    } else {
      return null;
    }
  }
  function __lovFmtDuration(secs) {
    if (secs == null || !isFinite(secs) || secs < 0) {
      return null;
    }
    secs = Math.round(secs);
    var h = Math.floor(secs / 3600);
    var m = Math.floor(secs % 3600 / 60);
    var s = secs % 60;
    function p2(v) {
      if (v < 10) {
        return "0" + v;
      } else {
        return "" + v;
      }
    }
    if (h > 0) {
      return h + ":" + p2(m) + ":" + p2(s);
    } else {
      return m + ":" + p2(s);
    }
  }
  function __lovDurationCandidates(row) {
    var out = [];
    try {
      var nodes = row.querySelectorAll("span,div");
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.firstElementChild) {
          continue;
        }
        var t = (n.textContent || "").trim();
        if (!t || t.length > 12) {
          continue;
        }
        if (/^\d{1,2}:[0-5]\d(?::[0-5]\d)?$/.test(t)) {
          out.push({
            node: n,
            text: t
          });
        }
      }
    } catch (e) {}
    return out;
  }
  function __lovClockToken(row) {
    try {
      var host = row.querySelector("[data-pre-plain-text]") || row.closest("[data-pre-plain-text]");
      var raw = host ? host.getAttribute("data-pre-plain-text") || "" : "";
      var m = raw.match(/(\d{1,2}:[0-5]\d(?::[0-5]\d)?)/);
      if (m) {
        return m[1];
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  function __lovVoiceDuration(row) {
    var clock = __lovClockToken(row);
    var cands = __lovDurationCandidates(row);
    var i;
    var c;
    for (i = 0; i < cands.length; i++) {
      c = cands[i];
      if (c.text === clock) {
        continue;
      }
      try {
        if (c.node.closest("[data-icon='audio-play'],[data-icon='audio-pause'],[data-icon='ptt-status'],[aria-label*='Voice message'],[role='application']")) {
          return __lovParseDurationText(c.text);
        }
      } catch (e) {}
    }
    for (i = 0; i < cands.length; i++) {
      if (cands[i].text !== clock) {
        return __lovParseDurationText(cands[i].text);
      }
    }
    try {
      var a = row.querySelector("audio");
      if (a && isFinite(a.duration) && a.duration > 0) {
        return Math.round(a.duration);
      }
    } catch (e) {}
    return null;
  }
  // CSR v4.5: accept only an actual call EVENT bubble, never the call button
  // in a group/chat header or a message mentioning the word "call".
  // Full call metadata may not be exposed by WhatsApp Web.
  // CSR v4.9: explicit event evidence, scoped to a *single* conversation
  // message. A generic icon or ordinary text saying "call me" is not a call.
  var __LOV_CALL_ICON__ = "[data-icon='call-incoming'],[data-icon='call-outgoing'],[data-icon='call-missed'],[data-icon='call-rejected'],[data-icon='status-call'],[data-icon='video-call'],[data-icon='call-video'],[data-icon='voice-call']";
  var __LOV_CALL_TEXT__ = /(?:\b(?:missed|incoming|outgoing|voice|video|group)\s+call\b|\bcall\s+(?:ended|declined|rejected|not\s+answered|back|duration)\b|\byou\s+missed\s+(?:a\s+)?call\b|\b(?:no\s+answer|unanswered)\b)/i;
  function __lovIsCallRow(row) {
    try {
      if (!row || typeof row.querySelector !== "function") {
        return false;
      }
      var definite = !!row.matches?.(".message-in, .message-out, [data-testid=\"call-event\"], [data-testid=\"call-log-message\"], [data-testid=\"call-message\"]");
      var hasMessage = definite || !!row.querySelector("[data-pre-plain-text], [data-testid=\"msg-container\"]") || !!row.matches?.("[role=\"row\"]") && !!row.querySelector(__LOV_CALL_ICON__);
      if (!hasMessage) {
        return false;
      }
      // Exclude conversation-pane ancestors containing multiple chat bubbles.
      if (row.querySelectorAll && row.querySelectorAll("[data-testid=\"msg-container\"]").length > 1) {
        return false;
      }
      var raw = String(row.innerText || row.textContent || "").replace(/\s+/g, " ").trim();
      if (!raw || raw.length > 240) {
        return false;
      }
      var hasIcon = !!row.querySelector(__LOV_CALL_ICON__);
      // Current WhatsApp (verified live, Nov 2026) exposes the call glyph as an svg
      // aria-label/title like "ic-phone-callback-filled" / "ic-video-*", NOT a
      // data-icon, so __LOV_CALL_ICON__ misses it. Detect those glyph names too.
      if (!hasIcon) {
        var glyphs = row.querySelectorAll("[aria-label], svg title, title");
        for (var gi = 0; gi < glyphs.length && gi < 30; gi++) {
          var gl = String(glyphs[gi].getAttribute?.("aria-label") || glyphs[gi].textContent || "");
          if (/\bic-(?:phone|video|call)[\w-]*\b/i.test(gl)) {
            hasIcon = true;
            break;
          }
        }
      }
      var eventMarker = !!row.matches?.("[data-testid=\"call-event\"], [data-testid=\"call-log-message\"], [data-testid=\"call-message\"]") || !!row.querySelector("[data-testid=\"call-event\"], [data-testid=\"call-log-message\"], [data-testid=\"call-message\"]");
      var hasDpt = !!row.querySelector("[data-pre-plain-text]");
      // Structured WhatsApp call bubble sometimes renders simply "Call" or
      // "Voice call" with a clock. Require a distinctive icon or event marker.
      if ((eventMarker || hasIcon) && (__LOV_CALL_TEXT__.test(raw) || /^call(?:\s+(?:at\s+)?\d{1,2}:[0-5]\d\s*(?:am|pm)?)?$/i.test(raw))) {
        return true;
      }
      // Current WhatsApp renders a call EVENT as a plain conv-msg system bubble with
      // NO data-pre-plain-text (e.g. "Voice call · Accepted on another device"). A real
      // text message that merely mentions a call ALWAYS has data-pre-plain-text, so the
      // absence of it on a single-bubble row whose text matches the call wording
      // reliably marks a genuine call event.
      if (!hasDpt && __LOV_CALL_TEXT__.test(raw)) {
        return true;
      }
      // Legacy: call wording inside a definite message bubble.
      if (!definite && !hasDpt) {
        return false;
      }
      return __LOV_CALL_TEXT__.test(raw);
    } catch (_) {
      return false;
    }
  }
  function __lovCallInfo(row) {
    var t = "";
    try {
      t = (row.innerText || row.textContent || "").trim();
    } catch (e) {}
    var lower = t.toLowerCase();
    var kind = /video/i.test(t) || row.querySelector("[data-icon='video-call'],[data-icon='call-video']") ? "video" : "voice";
    var direction = "unknown";
    if (row.querySelector("[data-icon='call-outgoing']")) {
      direction = "outgoing";
    } else if (row.querySelector("[data-icon='call-incoming']")) {
      direction = "incoming";
    } else if (row.querySelector("[data-icon='call-missed'],[data-icon='call-rejected']")) {
      direction = "missed";
    } else if (/missed/.test(lower)) {
      direction = "missed";
    } else if (row.classList && row.classList.contains("message-out")) {
      direction = "outgoing";
    } else if (row.classList && row.classList.contains("message-in")) {
      direction = "incoming";
    }
    // Current WhatsApp call bubbles carry neither call-direction icons nor
    // message-in/out classes. Fall back to the same reliable per-row signals used
    // for chat messages: the directional tail icon, then the "You:" sender label.
    if (direction === "unknown") {
      if (row.querySelector?.("[data-icon=\"tail-out\"]")) {
        direction = "outgoing";
      } else if (row.querySelector?.("[data-icon=\"tail-in\"]")) {
        direction = "incoming";
      } else {
        try {
          var al = row.querySelectorAll?.("[aria-label]") || [];
          for (var di = 0; di < al.length && di < 24; di++) {
            var mm = String(al[di].getAttribute("aria-label") || "").match(/^(.{1,40}):$/);
            if (mm) {
              direction = mm[1].trim() === "You" ? "outgoing" : "incoming";
              break;
            }
          }
        } catch (_) {}
      }
    }
    var missed = /\b(missed|no answer|unanswered|declined|rejected)\b/i.test(lower) || direction === "missed" || !!row.querySelector("[data-icon='call-missed'],[data-icon='call-rejected']");
    var clock = __lovClockToken(row);
    var secs = null;
    var cands = __lovDurationCandidates(row);
    for (var i = 0; i < cands.length; i++) {
      if (cands[i].text !== clock) {
        secs = __lovParseDurationText(cands[i].text);
        break;
      }
    }
    if (secs == null) {
      var w = t.match(/(\d+\s*(?:h|hr|hrs|hour|hours)\s*)?(\d+\s*(?:m|min|mins|minute|minutes)\s*)?(\d+\s*(?:s|sec|secs|second|seconds))?/i);
      if (w && w[0] && w[0].trim()) {
        secs = __lovParseDurationText(w[0]);
      }
    }
    // Some WhatsApp builds expose duration in an aria-label/title rather
    // than as a leaf text node. Use only explicit duration labels: NEVER
    // interpret the call's clock time as a length.
    if (secs == null && !missed) {
      try {
        var candidates = [t].concat(Array.from(row.querySelectorAll("[aria-label],[title]")).slice(0, 40).flatMap(function (el) {
          return [el.getAttribute("aria-label"), el.getAttribute("title")];
        }));
        for (var ci = 0; ci < candidates.length; ci++) {
          var raw = String(candidates[ci] || "");
          var explicit = raw.match(/(?:call\s+)?duration\s*[:：-]?\s*(\d{1,2}:[0-5]\d(?::[0-5]\d)?|(?:\d+\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s*){1,3})/i);
          if (explicit) {
            secs = __lovParseDurationText(explicit[1]);
            if (secs != null) {
              break;
            }
          }
        }
      } catch (e) {}
    }
    if (missed) {
      secs = 0;
    }
    return {
      direction: direction === "missed" ? "missed" : direction,
      kind: kind,
      connected: !missed && secs != null && secs > 0,
      seconds: secs == null ? null : secs
    };
  }
  var __lovMediaKind__ = v762;
  v762 = function (row) {
    if (__lovIsCallRow(row)) {
      return "call";
    }
    return __lovMediaKind__(row);
  };
  /* CSR v4.1: WhatsApp's compact PTT players do not always expose the old
     audio-play icon. Recognize their structured play/waveform controls before
     falling back to the image detector (a voice note can contain a photo avatar).
     This only identifies audio placeholders; it does NOT fetch media inline. */
  function __csrIsVoiceBubble(row) {
    if (!row || typeof row.querySelector !== "function") {
      return false;
    }
    try {
      if (row.querySelector("audio, [data-icon=\"ptt-play\"], [data-icon=\"ptt-pause\"], [data-icon=\"audio-play\"], [data-icon=\"audio-pause\"], [data-icon=\"ptt-status\"], [data-icon=\"ptt-status-start\"], [data-testid=\"ptt-play\"], [data-testid=\"audio-player\"], [data-testid=\"ptt-player\"], [data-testid*=\"voice-note\"], [data-testid*=\"audio-player\"], [data-testid*=\"audio-msg\"], [data-testid*=\"ptt\"], [data-testid*=\"voice-player\"], [data-icon=\"audio-msg\"], [data-icon=\"ptt-download\"], [aria-label*=\"voice message\" i], [aria-label*=\"voice note\" i], [aria-label*=\"play audio\" i], [aria-label*=\"play voice\" i]")) {
        return true;
      }
      // New WhatsApp waveform player variants may use anonymous SVG buttons.
      // Require waveform + play/pause control + a duration token together so a
      // regular image or a chat header never gets mislabeled as a voice note.
      var waveform = row.querySelector("[data-testid*=\"waveform\"], [data-testid*=\"audio-wave\"], [class*=\"waveform\"], [class*=\"audio-wave\"], [aria-label*=\"audio waveform\" i]");
      // v4.10: In the verified Nov-2026 WhatsApp DOM, a 0:03 voice bubble
      // has a <canvas> waveform in its own msg-container; neither a PTT
      // icon nor a class containing "waveform" is present. Do not scan the
      // conversation pane: this function only receives a single message row.
      var canvasWaveform = row.querySelector("canvas");
      if (!waveform && !canvasWaveform) {
        return false;
      }
      var player = row.querySelector("button, [role=\"button\"], [data-icon*=\"play\"], [data-icon*=\"pause\"]");
      // The same WhatsApp build can render the Play triangle as a bare SVG
      // rather than a semantic button. A canvas alone is not sufficient.
      if (!player && canvasWaveform) {
        player = row.querySelector("svg");
      }
      if (!player) {
        return false;
      }
      var txt = String(row.innerText || row.textContent || "");
      // Preserve the original v4.1 named-waveform behavior. The stricter
      // clock-vs-duration check below is only for new anonymous canvases.
      if (waveform) {
        return /(?:^|\s)\d{1,2}:\d{2}(?=\s|$)/.test(txt);
      }
      // WhatsApp also renders message CLOCK timestamps (e.g. 9:21 PM).
      // Reject clock-only text: the voice must contain a separate MM:SS
      // duration that is not directly followed by AM/PM.
      var tokens = /(?:^|\s)(\d{1,2}:[0-5]\d)(?=\s|$)/g;
      var match;
      while ((match = tokens.exec(txt)) !== null) {
        var after = txt.slice(match.index + match[0].length);
        if (!/^\s*(?:am|pm)\b/i.test(after)) {
          return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }
  var __csrMediaBeforeVoicePatch = v762;
  v762 = function (row) {
    if (__lovIsCallRow(row)) {
      return "call";
    }
    if (__csrIsVoiceBubble(row)) {
      return "voice";
    }
    return __csrMediaBeforeVoicePatch(row);
  };
  // CSR v4.5: Never scan arbitrary div[role=row]/div[data-id] for calls.
  // That sweep included group headers and duplicated actual message wrappers.
  // The core message-row reader already covers real call event bubbles.
  function __lovDividerMidnight(row, order) {
    try {
      if (row.querySelector("[data-pre-plain-text]")) {
        return null;
      }
      var t = (row.innerText || row.textContent || "").trim();
      if (!t || t.length > 24) {
        return null;
      }
      if (!__lovLooksLikeStamp(t)) {
        return null;
      }
      if (__LOV_TIME_RE.test(t)) {
        return null;
      }
      var d = __lovLabelToDate(t, order);
      if (!d) {
        return null;
      }
      var m = new Date(d.getTime());
      m.setHours(0, 0, 0, 0);
      return m.getTime();
    } catch (e) {
      return null;
    }
  }
  function __csrTrustedMessageId(row) {
    // A trustworthy WhatsApp message id is either the legacy serialized form
    // (true_/false_<chat>@c.us_<HEX>) OR, in the current build (verified live,
    // Nov 2026), the bare uppercase-hex message id exposed on data-id /
    // data-testid="conv-msg-<HEX>" (e.g. ACE35E5AFAC83EB2A263D388FF64AC1A or the
    // shorter outgoing 3EB0... ids). Accepting the bare id is essential: without
    // a source id the backend cannot locate the message to download voice media.
    function isWaMsgId(v) {
      return /^(?:true|false)_[^\s|]{6,}$/i.test(v) || /^[0-9A-F]{18,40}$/.test(v);
    }
    var id = "";
    try {
      id = __wceFindDataId(row) || "";
    } catch (_) {}
    if (isWaMsgId(id)) {
      return id;
    }
    // The current WhatsApp build can place the ID on a bubble descendant.
    try {
      var items = row.querySelectorAll?.("[data-id],[data-testid^=\"conv-msg-\"]") || [];
      for (var i = 0; i < items.length && i < 12; i++) {
        var v = items[i].getAttribute("data-id") || String(items[i].getAttribute("data-testid") || "").replace(/^conv-msg-/, "");
        if (isWaMsgId(v)) {
          return v;
        }
      }
    } catch (_) {}
    return "";
  }
  // v4.7: Directions are a three-state classification until supported by
  // message-local evidence. A missing marker is NOT proof of an incoming chat.
  function __csrDirectionEvidence(row) {
    var sourceId = __csrTrustedMessageId(row);
    if (/^true_/i.test(sourceId)) {
      return {
        fromMe: true,
        proof: "whatsapp_id"
      };
    }
    if (/^false_/i.test(sourceId)) {
      return {
        fromMe: false,
        proof: "whatsapp_id"
      };
    }

    // Current WhatsApp (verified live, Nov 2026) no longer emits message-in/out
    // classes or true_/false_ data-id prefixes. Each message row instead carries:
    //  (a) a language-independent directional tail icon (tail-out = outgoing,
    //      tail-in = incoming) on the first message of each run, and
    //  (b) a semantic sender aria-label ("You:" for outgoing, "<Sender>:" for
    //      incoming) present on EVERY message, including grouped ones that share
    //      a single tail. Quoted replies expose only "Quoted message" (never a
    //      leaking "You:"), so the first sender-colon label belongs to the row.
    if (row.querySelector?.("[data-icon=\"tail-out\"]")) {
      return {
        fromMe: true,
        proof: "tail_out"
      };
    }
    if (row.querySelector?.("[data-icon=\"tail-in\"]")) {
      return {
        fromMe: false,
        proof: "tail_in"
      };
    }
    // Delivery / read status ticks (clock, single-, double-check) render ONLY on the
    // counselor's OWN outgoing messages -- never on an incoming one. This is the most
    // reliable group signal when tails are absent: in a group only the first message of
    // a run carries a tail, so grouped outgoing replies otherwise fall through to the
    // aria/geometry fallbacks and get mis-read as incoming (the sender/receiver swap).
    // Icon-based, so language-independent. Incoming messages carry no status icon.
    if (row.querySelector?.("[data-icon=\"msg-dblcheck\"],[data-icon=\"msg-check\"],[data-icon=\"msg-time\"]")) {
      return {
        fromMe: true,
        proof: "status_tick"
      };
    }
    try {
      var ariaNodes = row.querySelectorAll?.("[aria-label]") || [];
      for (var ai = 0; ai < ariaNodes.length && ai < 24; ai++) {
        var m = String(ariaNodes[ai].getAttribute("aria-label") || "").match(/^(.{1,40}):$/);
        if (m) {
          return {
            fromMe: m[1].trim() === "You",
            proof: "aria_sender"
          };
        }
      }
    } catch (_) {}

    // WhatsApp's layout can put the in/out class on the outer message wrapper,
    // not the currently sampled voice player. Inspect only nearest wrappers.
    var cursor = row;
    for (var n = 0; n < 9 && cursor; n++, cursor = cursor.parentElement) {
      if (cursor.classList?.contains("message-out")) {
        return {
          fromMe: true,
          proof: "message_out_wrapper"
        };
      }
      if (cursor.classList?.contains("message-in")) {
        return {
          fromMe: false,
          proof: "message_in_wrapper"
        };
      }
      if (cursor.id === "main" || cursor.classList?.contains("copyable-area")) {
        break;
      }
    }
    // Some builds pass an outer row containing one inner bubble wrapper.
    var outgoing = row.querySelector?.(".message-out");
    var incoming = row.querySelector?.(".message-in");
    if (!!outgoing !== !!incoming) {
      return {
        fromMe: !!outgoing,
        proof: "inner_message_wrapper"
      };
    }

    // A final *conservative* layout fallback for builds without message
    // classes/IDs: WhatsApp lays out narrow incoming bubbles to the left and
    // outgoing ones to the right. Never use screen geometry when it is unclear.
    try {
      var viewport = document.querySelector("#main .copyable-area") || document.querySelector("#main");
      var vr = viewport?.getBoundingClientRect?.();
      var candidate = row.querySelector?.("[data-testid=\"msg-container\"], [data-pre-plain-text], [data-testid*=\"audio-player\"], .copyable-text") || row;
      var cr = candidate.getBoundingClientRect?.();
      if (vr && cr && vr.width > 350 && cr.width > 45 && cr.width < vr.width * 0.66 && cr.left >= vr.left - 12 && cr.right <= vr.right + 12) {
        var relative = ((cr.left + cr.right) / 2 - vr.left) / vr.width;
        if (relative >= 0.71) {
          return {
            fromMe: true,
            proof: "right_aligned_bubble"
          };
        }
        if (relative <= 0.29) {
          return {
            fromMe: false,
            proof: "left_aligned_bubble"
          };
        }
      }
    } catch (_) {}
    return {
      fromMe: null,
      proof: "unknown"
    };
  }
  function __csrOutgoingRow(row) {
    return __csrDirectionEvidence(row).fromMe === true;
  }
  function __lovStampMs(msg, order) {
    try {
      var d = v779(msg, order);
      if (d) {
        return d.getTime();
      }
      var alt = v779(msg, order === "MDY" ? "DMY" : "MDY");
      if (alt) {
        return alt.getTime();
      }
    } catch (e) {}
    return null;
  }
  v752 = function () {
    var out = [];
    var order;
    try {
      order = __lovDateOrder();
    } catch (e) {
      order = "DMY";
    }
    var rows = v685();
    var dayMs = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var div = __lovDividerMidnight(row, order);
      if (div != null) {
        dayMs = div;
        continue;
      }
      var isCall = __lovIsCallRow(row);
      var system = isCall ? false : v756(row);
      var fromMe = __csrOutgoingRow(row);
      var parsed = v760(row);
      var stamp = parsed.timestamp;
      var sender = parsed.sender;
      var media = system ? undefined : v762(row);
      var text = v764(row);
      if (!text && !media && !system) {
        continue;
      }
      var msg = {
        timestamp: stamp,
        sender: sender || (fromMe ? "You" : ""),
        fromMe: fromMe,
        text: system ? (row.innerText ?? "").trim() : text,
        system: system,
        media: media,
        mediaUrl: media && media !== "call" ? v749(row) : undefined,
        mediaDuration: undefined
      };
      if (media === "voice" || media === "audio") {
        var vs = __lovVoiceDuration(row);
        if (vs != null) {
          msg.durationSeconds = vs;
          msg.mediaDuration = __lovFmtDuration(vs);
        }
      } else if (media === "call") {
        var ci = __lovCallInfo(row);
        msg.call = ci;
        msg.system = false;
        if (ci.seconds != null) {
          msg.durationSeconds = ci.seconds;
          msg.mediaDuration = __lovFmtDuration(ci.seconds);
        }
        msg.text = "";
      }
      var ts = __lovStampMs(msg, order);
      if (ts == null && dayMs != null) {
        var mins = null;
        try {
          mins = v459(stamp || row.innerText || "");
        } catch (e) {}
        ts = mins != null ? dayMs + mins * 60000 : dayMs;
      }
      msg.tsMs = ts;
      if (ts != null) {
        dayMs = new Date(ts).setHours(0, 0, 0, 0);
      }
      var key;
      try {
        key = row.getAttribute("data-id") || row.querySelector("[data-id]") && row.querySelector("[data-id]").getAttribute("data-id") || null;
      } catch (e) {
        key = null;
      }
      if (!key) {
        key = v746(row, msg);
      }
      out.push({
        key: key,
        message: msg
      });
    }
    return out;
  };
  var __LOV_LAST_STATS__ = null;
  v784 = function (list, startDate) {
    if (!startDate) {
      return list;
    }
    var startMs = startDate.getTime();
    var endMs = __lovEndFor(startMs);
    var arr = list.slice();
    var order;
    try {
      order = v436(arr);
    } catch (e) {
      order = "DMY";
    }
    var i;
    var ts = [];
    for (i = 0; i < arr.length; i++) {
      var v = arr[i] && arr[i].tsMs != null ? arr[i].tsMs : __lovStampMs(arr[i], order);
      ts[i] = v == null || !isFinite(v) ? null : v;
    }
    var last = null;
    for (i = 0; i < ts.length; i++) {
      if (ts[i] == null) {
        ts[i] = last;
      } else {
        last = ts[i];
      }
    }
    var next = null;
    for (i = ts.length - 1; i >= 0; i--) {
      if (ts[i] == null) {
        ts[i] = next;
      } else {
        next = ts[i];
      }
    }
    var kept = [];
    var unknown = 0;
    for (i = 0; i < arr.length; i++) {
      if (ts[i] == null) {
        unknown++;
        kept.push(arr[i]);
        continue;
      }
      arr[i].tsMs = ts[i];
      if (ts[i] >= startMs && ts[i] <= endMs) {
        kept.push(arr[i]);
      }
    }
    __LOV_LAST_STATS__ = {
      start: startMs,
      end: endMs,
      scanned: arr.length,
      kept: kept.length,
      undated: unknown
    };
    return kept;
  };
  var __LOV_TRUNCATED__ = false;
  v818 = async function (onProgress, shouldCancel, wantMedia, startDate) {
    var scroller = v713();
    if (!scroller) {
      return v752().map(function (e) {
        return e.message;
      });
    }
    var startMs = startDate ? startDate.getTime() : null;
    var seen = new Set();
    var all = [];
    var mediaQueue = [];
    __LOV_TRUNCATED__ = false;
    function harvest(prepend) {
      var fresh = [];
      var batch = v752();
      for (var i = 0; i < batch.length; i++) {
        var e = batch[i];
        if (seen.has(e.key)) {
          continue;
        }
        seen.add(e.key);
        var m = e.message;
        // Preserve actual WhatsApp message IDs for later voice queue playback.
        // Synthetic deduplication keys contain "|" and must never be sent to
        // the WhatsApp audio resolver.
        if ((m.media === "voice" || m.media === "audio") && !m.sourceMessageId && e.key && String(e.key).length <= 200 && !String(e.key).includes("|")) {
          m.sourceMessageId = String(e.key);
        }
        if ((wantMedia || m.media === "voice") && v802(m, startDate)) {
          mediaQueue.push({
            m: m,
            k: e.key
          });
        }
        fresh.push(m);
      }
      if (fresh.length > 0) {
        if (prepend) {
          all.unshift.apply(all, fresh);
        } else {
          all.push.apply(all, fresh);
        }
      }
      onProgress(all.length);
      return fresh.length;
    }
    function fire() {
      scroller.dispatchEvent(new Event("scroll", {
        bubbles: true
      }));
    }
    async function waitForGrowth(ms) {
      var deadline = Date.now() + ms;
      while (Date.now() < deadline) {
        var n = harvest(true);
        if (n > 0) {
          return n;
        }
        await v547(40);
      }
      return harvest(true);
    }
    function passedCutoff() {
      if (startMs == null) {
        return false;
      }
      for (var i = 0; i < all.length; i++) {
        var t = all[i].tsMs;
        if (t != null && t < startMs) {
          return true;
        }
      }
      return false;
    }
    function atConversationTop() {
      try {
        if (scroller.scrollTop > 4) {
          return false;
        }
        var t = scroller.innerText || "";
        if (/end-to-end encrypted|Messages and calls are end-to-end|created group|You created this group/i.test(t.slice(0, 400))) {
          return true;
        }
      } catch (e) {}
      return false;
    }
    scroller.scrollTop = scroller.scrollHeight;
    fire();
    var primed = Date.now() + 2500;
    while (v685().length === 0 && Date.now() < primed) {
      await v547(25);
    }
    harvest(false);
    var BUDGET_MS = 240000;
    var MAX_IDLE = 8;
    var deadline = Date.now() + BUDGET_MS;
    var idle = 0;
    var lastHeight = -1;
    for (var round = 0; round < 4000; round++) {
      if (shouldCancel()) {
        break;
      }
      if (passedCutoff()) {
        break;
      }
      if (Date.now() > deadline) {
        __LOV_TRUNCATED__ = !passedCutoff();
        break;
      }
      scroller.scrollTop = 0;
      fire();
      var grew = await waitForGrowth(900 + idle * 700);
      if (grew > 0) {
        idle = 0;
        lastHeight = scroller.scrollHeight;
        continue;
      }
      scroller.scrollTop = 40;
      fire();
      await v547(150);
      scroller.scrollTop = 0;
      fire();
      grew = await waitForGrowth(900 + idle * 700);
      if (grew > 0) {
        idle = 0;
        lastHeight = scroller.scrollHeight;
        continue;
      }
      if (atConversationTop() && scroller.scrollHeight === lastHeight) {
        break;
      }
      idle++;
      lastHeight = scroller.scrollHeight;
      if (idle >= MAX_IDLE) {
        __LOV_TRUNCATED__ = !passedCutoff() && !atConversationTop();
        break;
      }
    }
    if (mediaQueue.length > 0 && !shouldCancel()) {
      var idx = 0;
      async function worker() {
        while (true) {
          var k = idx++;
          if (k >= mediaQueue.length || shouldCancel()) {
            return;
          }
          var m = mediaQueue[k].m;
          if (m.mediaUrl) {
            m.mediaData = await v766(m.mediaUrl).catch(function () {
              return undefined;
            });
          } else if (m.media === "voice") {
            m.mediaData = await (window.__lovDlAudio__ ? window.__lovDlAudio__(mediaQueue[k].k) : Promise.resolve()).catch(function () {
              return undefined;
            });
          }
          if (m.media === "voice" && m.durationSeconds == null && m.mediaData) {
            try {
              var probe = await new Promise(function (res) {
                var a = new Audio();
                function done(v) {
                  res(v);
                }
                a.onloadedmetadata = function () {
                  done(isFinite(a.duration) ? a.duration : null);
                };
                a.onerror = function () {
                  done(null);
                };
                setTimeout(function () {
                  done(null);
                }, 4000);
                a.src = m.mediaData;
              });
              if (probe != null) {
                m.durationSeconds = Math.round(probe);
                m.mediaDuration = __lovFmtDuration(m.durationSeconds);
              }
            } catch (e) {}
          }
        }
      }
      await Promise.all(Array.from({
        length: Math.min(6, mediaQueue.length)
      }, worker));
    }
    scroller.scrollTop = scroller.scrollHeight;
    return all;
  };
  v435.call = "<call>";
  v477 = function (msg, opts) {
    var parts = [];
    if (msg.media === "call") {
      var c = msg.call || {};
      var label = c.kind === "video" ? "Video call" : "Voice call";
      if (c.direction === "missed") {
        parts.push("[Missed " + label.toLowerCase() + "]");
      } else {
        var dir = c.direction === "outgoing" ? "outgoing" : c.direction === "incoming" ? "incoming" : null;
        var head = label + (dir ? ", " + dir : "");
        parts.push("[" + head + (msg.mediaDuration ? " · " + msg.mediaDuration : " · duration unavailable") + "]");
      }
    } else if (msg.media === "voice" || msg.media === "audio") {
      var kind = msg.media === "audio" ? "Audio" : "Voice message";
      parts.push("[" + kind + (msg.mediaDuration ? " · " + msg.mediaDuration : " · duration unavailable") + "]");
    } else if (msg.media) {
      parts.push(v435[msg.media] || v435.unknown);
    }
    if (msg.text) {
      parts.push(msg.text);
    }
    return parts.join(" ").trim();
  };
  function __lovTotals(messages) {
    var t = {
      voiceCount: 0,
      voiceSecs: 0,
      voiceUnknown: 0,
      callCount: 0,
      callSecs: 0,
      missed: 0
    };
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.media === "voice" || m.media === "audio") {
        t.voiceCount++;
        if (m.durationSeconds != null) {
          t.voiceSecs += m.durationSeconds;
        } else {
          t.voiceUnknown++;
        }
      } else if (m.media === "call") {
        t.callCount++;
        if (m.call && m.call.direction === "missed") {
          t.missed++;
        } else if (m.durationSeconds != null) {
          t.callSecs += m.durationSeconds;
        }
      }
    }
    return t;
  }
  function __lovTotalsBlock(messages) {
    var t = __lovTotals(messages);
    if (0 === 0 && 0 === 0) {
      return "";
    }
    var lines = ["", "--- Voice & call summary ---"];
    if (0 > 0) {
      lines.push("Voice messages: 0  |  total " + (__lovFmtDuration(0) || "0:00") + (0 ? "  (0 without a readable length)" : ""));
    }
    if (0 > 0) {
      lines.push("Calls: 0  |  connected time " + (__lovFmtDuration(0) || "0:00") + (0 ? "  |  missed: 0" : ""));
    }
    return lines.join("\n") + "\n";
  }
  var __lovChatTxt__ = v492;
  v492 = function (chat, opts) {
    var base = __lovChatTxt__(chat, opts);
    return base + __lovTotalsBlock(chat.messages || []);
  };
  var __lovManyTxt__ = v499;
  v499 = function (chats, opts) {
    var out = chats.map(function (c) {
      var body = v488(c, opts).map(function (m) {
        return v482(m, opts);
      }).filter(function (s) {
        return s.length > 0;
      });
      return v498 + "\nCHAT: " + c.title + "\n" + v498 + "\n\n" + body.join("\n") + "\n" + __lovTotalsBlock(c.messages || []);
    }).join("\n\n\n");
    return out + "\n\n" + v498 + "\nEND OF EXPORT\n" + v498 + "\n";
  };
  var __lovMakeCtxInner__ = __lovMakeCtx;
  __lovMakeCtx = async function (opts) {
    var ctx = await __lovMakeCtxInner__(opts);
    if (ctx) {
      ctx.stopAfter = 25;
      ctx.minScans = 5;
    }
    return ctx;
  };
  async function v869(v1074, v1075, v1076, v1077) {
    let v1078 = v1076 || v649();
    let v1079 = await v846(v1074, v1075, v1078);
    v1079.messages = v784(v1079.messages, v1078);
    let v1080 = {
      title: v1079.title,
      messages: v1079.messages,
      cachedAt: Date.now(),
      hasMedia: !!v1075,
      cutoff: v1078.getTime()
    };
    v772.set(v637(v1079.title), v1080);
    if (v1077 && v637(v1077) && v637(v1077) !== v637(v1079.title)) {
      v772.set(v637(v1077), v1080);
    }
    return v1079;
  }

  /* ============ WCE-PATCH v1.8.2: filter-bounded, fast multi-chat export ============
   *
   * Four defects fixed, all of them causes of the "export sticks / keeps
   * scrolling up / loads chats outside the filter" report.
   *
   * D1  The active row parser (the v752 override) had NO node cache, even
   *     though an earlier revision of the same function did. The loader polls
   *     it every 40ms; each poll re-ran innerText, the media probe, call
   *     detection and voice-duration extraction over EVERY rendered bubble.
   *     Cost grows with messages loaded, so each scroll round gets slower than
   *     the last -- the classic "it froze" profile. Now cached per DOM node.
   *
   * D2  passedCutoff() re-scanned the whole accumulated array every round, and
   *     `all.unshift.apply(all, fresh)` both re-indexed the array on every page
   *     (quadratic) and passed each element as a call argument, which throws
   *     RangeError on a large page. Now: O(1) cutoff via a running minimum, and
   *     append-pages-then-reverse instead of unshift.
   *
   * D3  The cutoff was only tested at the TOP of each round, so after loading
   *     the page that crossed the boundary the loader still paid for another
   *     scroll + wait. And the per-chat ceiling was a flat 240s with MAX_IDLE 8
   *     regardless of filter, so one dead chat stalled every chat behind it.
   *     Now the cutoff is tested immediately after every successful harvest,
   *     and the budget is scaled to the selected range.
   *
   * D4  Chat-list loading used stopAfter=25 (25 consecutive out-of-range rows
   *     before stopping) and admitted rows whose date label could not be parsed
   *     even when they sat well below the in-range boundary. That is what
   *     pulled in chats older than the selected window. Now stopAfter=6, and an
   *     unparseable row below the first out-of-range row is treated as
   *     out-of-range rather than kept.
   */

  /* ---- D1: cache parsed rows against the DOM node ---- */
  var __wceRowCache = new WeakMap();
  function __wceBuildRow(row, order) {
    var div = __lovDividerMidnight(row, order);
    if (div != null) {
      return {
        type: "divider",
        ms: div,
        cacheable: true
      };
    }
    var isCall = __lovIsCallRow(row);
    var system = isCall ? false : v756(row);
    var direction = __csrDirectionEvidence(row);
    // Unknown evidence falls back to the raw class instead of silently defaulting
    // to incoming (sender/receiver swap); known evidence always wins.
    var fromMe = direction.fromMe === null ? row.classList.contains("message-out") : direction.fromMe;
    var parsed = v760(row);
    var stamp = parsed.timestamp;
    var sender = parsed.sender;
    var media = system ? undefined : v762(row);
    var text = v764(row);
    if (!text && !media && !system) {
      return null;
    }
    var msg = {
      timestamp: stamp,
      sender: fromMe ? "You" : sender || "",
      fromMe: fromMe,
      text: system ? (row.innerText ?? "").trim() : text,
      system: system,
      media: media,
      mediaUrl: media && media !== "call" ? v749(row) : undefined,
      mediaDuration: undefined
    };
    if (media === "voice" || media === "audio") {
      var vs = __lovVoiceDuration(row);
      if (vs != null) {
        msg.durationSeconds = vs;
        msg.mediaDuration = __lovFmtDuration(vs);
      }
    } else if (media === "call") {
      var ci = __lovCallInfo(row);
      msg.call = ci;
      msg.system = false;
      if (ci.seconds != null) {
        msg.durationSeconds = ci.seconds;
        msg.mediaDuration = __lovFmtDuration(ci.seconds);
      }
      msg.text = "";
    }
    msg.tsMs = __lovStampMs(msg, order);
    var mins = null;
    try {
      mins = v459(stamp || row.innerText || "");
    } catch (e) {}
    var key = null;
    try {
      var idEl = row.querySelector("[data-id]");
      key = row.getAttribute("data-id") || idEl && idEl.getAttribute("data-id") || null;
    } catch (e) {
      key = null;
    }
    if (!key) {
      key = v746(row, msg);
    }

    // Only freeze a row once WhatsApp has rendered its timestamp; a bubble
    // still hydrating reports an empty stamp and caching that would pin the
    // bad value in place for the rest of the run.
    var sourceId = __csrTrustedMessageId(row);
    // Carry the full WhatsApp ID for ALL messages. Back-end can then resolve
    // text-message direction and deduplicate actual DOM duplicate wrappers.
    if (sourceId && sourceId.length <= 200) {
      msg.sourceMessageId = sourceId;
    }
    // Legacy voice IDs without a direction prefix remain usable for audio lookup,
    // but are never treated as authoritative sender-direction evidence.
    if (!sourceId && (media === "voice" || media === "audio")) {
      var legacyId = __wceFindDataId(row);
      if (legacyId && legacyId.length <= 200 && !legacyId.includes("|")) {
        sourceId = legacyId;
        msg.sourceMessageId = legacyId;
      }
    }
    // Do not freeze a hydrated timestamp with an as-yet-unknown direction.
    return {
      type: "msg",
      key: sourceId || key,
      sourceId: sourceId,
      message: msg,
      minutes: mins,
      cacheable: !!stamp && direction.fromMe !== null
    };
  }
  v752 = function () {
    var out = [];
    var order;
    try {
      order = __lovDateOrder();
    } catch (e) {
      order = "DMY";
    }
    var rows = v685();
    var dayMs = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var hit = __wceRowCache.get(row);
      // An audio player may hydrate after its thumbnail/avatar was first
      // rendered as an image. Do not freeze that early classification in cache.
      if (hit && hit.type === "msg" && hit.message && hit.message.media !== "voice" && hit.message.media !== "audio" && __csrIsVoiceBubble(row)) {
        __wceRowCache.delete(row);
        hit = undefined;
      }
      if (hit === undefined) {
        hit = __wceBuildRow(row, order);
        if (hit && hit.cacheable) {
          __wceRowCache.set(row, hit);
        }
      }
      if (!hit) {
        continue;
      }
      if (hit.type === "divider") {
        dayMs = hit.ms;
        continue;
      }
      var msg = hit.message;
      // Voice assets require a real WhatsApp DOM identifier, not the
      // synthetic timestamp|sender|content key used for deduplication.
      if ((msg.media === "voice" || msg.media === "audio") && !msg.sourceMessageId) {
        var sourceId = String(hit.sourceId || "");
        if (sourceId && sourceId.length <= 200 && !sourceId.includes("|")) {
          msg.sourceMessageId = sourceId;
        }
      }
      // The divider chain is positional, so it is re-applied each pass rather
      // than cached. Assignment is idempotent -- `msg` is the same object the
      // accumulator already holds a reference to.
      if (msg.tsMs == null && dayMs != null) {
        msg.tsMs = hit.minutes != null ? dayMs + hit.minutes * 60000 : dayMs;
      }
      if (msg.tsMs != null) {
        dayMs = new Date(msg.tsMs).setHours(0, 0, 0, 0);
      }
      out.push({
        key: hit.key,
        message: msg
      });
    }
    return out;
  };

  /* ---- D2 + D3: bounded loader that stops at the filter edge ---- */
  v818 = async function (onProgress, shouldCancel, wantMedia, startDate) {
    var scroller = v713();
    if (!scroller) {
      return v752().map(function (e) {
        return e.message;
      });
    }
    var startMs = startDate ? startDate.getTime() : null;
    var filtered = startMs != null;
    // Derived from the cutoff itself, not __LOV_WIN__: callers that pass an
    // explicit cutoff down (the multi-chat path does) may not have refreshed
    // that shared state, and a stale 7 there would set a 65s ceiling on a
    // 30-day export.
    var days = filtered ? Math.max(1, Math.round((Date.now() - startMs) / 86400000)) : 0;
    var seen = new Set();
    var pages = []; // pages loaded by scrolling up; newest-loaded last
    var initial = []; // what was on screen when we started
    var mediaQueue = [];
    var total = 0;
    var oldestTs = null; // running minimum -> O(1) cutoff test
    __LOV_TRUNCATED__ = false;
    function harvest(prepend) {
      var fresh = [];
      var batch = v752();
      for (var i = 0; i < batch.length; i++) {
        var e = batch[i];
        if (seen.has(e.key)) {
          continue;
        }
        seen.add(e.key);
        var m = e.message;
        // Preserve actual WhatsApp message IDs for later voice queue playback.
        // Synthetic deduplication keys contain "|" and must never be sent to
        // the WhatsApp audio resolver.
        if ((m.media === "voice" || m.media === "audio") && !m.sourceMessageId && e.key && String(e.key).length <= 200 && !String(e.key).includes("|")) {
          m.sourceMessageId = String(e.key);
        }
        if (wantMedia && v802(m, startDate)) {
          mediaQueue.push({
            m: m,
            k: e.key
          });
        }
        if (m.tsMs != null && (oldestTs === null || m.tsMs < oldestTs)) {
          oldestTs = m.tsMs;
        }
        fresh.push(m);
      }
      if (fresh.length > 0) {
        if (prepend) {
          pages.push(fresh);
        } else {
          for (var j = 0; j < fresh.length; j++) {
            initial.push(fresh[j]);
          }
        }
        total += fresh.length;
        onProgress(total);
      }
      return fresh.length;
    }
    function assemble() {
      var out = [];
      for (var p = pages.length - 1; p >= 0; p--) {
        var pg = pages[p];
        for (var i = 0; i < pg.length; i++) {
          out.push(pg[i]);
        }
      }
      for (var k = 0; k < initial.length; k++) {
        out.push(initial[k]);
      }
      return out;
    }
    function passedCutoff() {
      return filtered && oldestTs !== null && oldestTs < startMs;
    }
    function fire() {
      scroller.dispatchEvent(new Event("scroll", {
        bubbles: true
      }));
    } // Only re-parse when the pane actually changed. The old version harvested
    // on every 40ms tick whether or not anything had rendered.
    async function waitForGrowth(ms) {
      var n = harvest(true);
      if (n > 0) {
        return n;
      }
      var deadline = Date.now() + ms;
      var baseH = scroller.scrollHeight;
      var baseN = v685().length;
      while (Date.now() < deadline) {
        await v547(30);
        if (scroller.scrollHeight !== baseH || v685().length !== baseN) {
          n = harvest(true);
          if (n > 0) {
            return n;
          }
          baseH = scroller.scrollHeight;
          baseN = v685().length;
        }
      }
      return harvest(true);
    } // innerText on the whole pane forces a full layout + text serialization,
    // so this is only consulted when the loader is already about to give up.
    function atConversationTop() {
      try {
        if (scroller.scrollTop > 4) {
          return false;
        }
        var t = scroller.innerText || "";
        return /end-to-end encrypted|Messages and calls are end-to-end|created group|You created this group/i.test(t.slice(0, 400));
      } catch (e) {
        return false;
      }
    }
    scroller.scrollTop = scroller.scrollHeight;
    fire();
    var primed = Date.now() + 2500;
    while (v685().length === 0 && Date.now() < primed) {
      await v547(25);
    }
    harvest(false);

    // Scale the ceiling to the window actually requested. A 24h export that
    // needs four minutes is not slow, it is broken -- and the old flat 240s
    // ceiling meant every chat behind it waited that out too.
    var BUDGET_MS = filtered ? Math.min(180000, 30000 + Math.max(1, days) * 5000) : 240000;
    var MAX_IDLE = filtered ? 4 : 8;
    var deadline = Date.now() + BUDGET_MS;
    var idle = 0;
    var lastHeight = -1;
    for (var round = 0; round < 4000; round++) {
      if (shouldCancel()) {
        break;
      }
      if (passedCutoff()) {
        break;
      }
      if (Date.now() > deadline) {
        __LOV_TRUNCATED__ = !passedCutoff();
        break;
      }
      var wait = filtered ? 700 + idle * 600 : 900 + idle * 700;
      scroller.scrollTop = 0;
      fire();
      var grew = await waitForGrowth(wait);
      if (grew > 0) {
        idle = 0;
        lastHeight = scroller.scrollHeight;
        if (passedCutoff()) {
          break;
        } // leave the moment the window is covered
        continue;
      }
      scroller.scrollTop = 40;
      fire();
      await v547(120);
      scroller.scrollTop = 0;
      fire();
      grew = await waitForGrowth(wait);
      if (grew > 0) {
        idle = 0;
        lastHeight = scroller.scrollHeight;
        if (passedCutoff()) {
          break;
        }
        continue;
      }
      idle++;
      var stable = scroller.scrollHeight === lastHeight;
      lastHeight = scroller.scrollHeight;
      if (idle >= MAX_IDLE - 1 && stable && atConversationTop()) {
        break;
      }
      if (idle >= MAX_IDLE) {
        __LOV_TRUNCATED__ = !passedCutoff() && !atConversationTop();
        break;
      }
    }
    if (mediaQueue.length > 0 && !shouldCancel()) {
      var idx = 0;
      async function worker() {
        while (true) {
          var k = idx++;
          if (k >= mediaQueue.length || shouldCancel()) {
            return;
          }
          var m = mediaQueue[k].m;
          if (m.mediaUrl) {
            m.mediaData = await v766(m.mediaUrl).catch(function () {
              return undefined;
            });
          } else if (m.media === "voice") {
            m.mediaData = await (window.__lovDlAudio__ ? window.__lovDlAudio__(mediaQueue[k].k) : Promise.resolve()).catch(function () {
              return undefined;
            });
          }
          if (m.media === "voice" && m.durationSeconds == null && m.mediaData) {
            try {
              var probe = await new Promise(function (res) {
                var a = new Audio();
                function done(v) {
                  res(v);
                }
                a.onloadedmetadata = function () {
                  done(isFinite(a.duration) ? a.duration : null);
                };
                a.onerror = function () {
                  done(null);
                };
                setTimeout(function () {
                  done(null);
                }, 4000);
                a.src = m.mediaData;
              });
              if (probe != null) {
                m.durationSeconds = Math.round(probe);
                m.mediaDuration = __lovFmtDuration(m.durationSeconds);
              }
            } catch (e) {}
          }
        }
      }
      await Promise.all(Array.from({
        length: Math.min(6, mediaQueue.length)
      }, worker));
    }
    scroller.scrollTop = scroller.scrollHeight;
    return assemble();
  };

  /* ---- D4: keep chat-list loading inside the selected window ---- */
  var __lovMakeCtxTuned__ = __lovMakeCtx;
  __lovMakeCtx = async function (opts) {
    var ctx = await __lovMakeCtxTuned__(opts);
    if (ctx) {
      // The list is recency-ordered, so a short run of out-of-range rows is
      // already conclusive. 25 was pulling in a screenful of older chats.
      ctx.stopAfter = 6;
      ctx.minScans = 2;
    }
    return ctx;
  };
  __lovCollect = function (map, ctx) {
    console.log("WCE-COLLECT-ACTIVE-123");
    if (!ctx) {
      return v624(map);
    }
    var rows = v559();
    var trailing = 0;
    var sawStale = false;
    ctx.scans++;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var id = v565(row);
      if (!id) {
        continue;
      }
      // Skip unread WhatsApp chats
      // Skip unread WhatsApp chats
      var __wceKey = String(id || "").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      if (ctx && !ctx.__wceUnreadIds) {
        ctx.__wceUnreadIds = new Set();
      }
      if (ctx && !ctx.__wceUnreadSummary) {
        ctx.__wceUnreadSummary = [];
      }
      if (__wceIsUnreadChat(row)) {
        if (ctx && ctx.__wceUnreadIds) {
          ctx.__wceUnreadIds.add(__wceKey);
        }

        // Keep unread chat title / number for UI + export + audit report
        if (ctx && ctx.__wceUnreadSummary && !ctx.__wceUnreadSummary.some(function (x) {
          return String(x).toLowerCase() === String(id).toLowerCase();
        })) {
          var __wceCleanUnreadTitle = String(id || "").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F]/g, "").replace(/\s+/g, " ").trim();
          var __wceUnreadValue = __wceCleanUnreadTitle || String(id || "").trim();
          var __wceAlreadyAdded = ctx.__wceUnreadSummary.some(function (x) {
            return String(x || "").trim().toLowerCase() === String(__wceUnreadValue || "").trim().toLowerCase();
          });
          if (!__wceAlreadyAdded) {
            ctx.__wceUnreadSummary.push(__wceUnreadValue);
          }
        }
        for (var oldId of Array.from(map.keys())) {
          var oldKey = String(oldId || "").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
          if (oldKey === __wceKey) {
            map.delete(oldId);
          }
        }
        console.log("[WCE] Skipping unread chat:", id);
        continue;
      }
      if (ctx && ctx.__wceUnreadIds && ctx.__wceUnreadIds.has(__wceKey)) {
        map.delete(id);
        continue;
      }
      var pinned = __lovIsPinned(row);
      var state = __lovRowState(row, ctx);
      if (state === "stale") {
        // Pinned rows float to the top regardless of age, so they must not
        // count towards the run that decides we have left the window.
        if (!pinned) {
          trailing++;
          sawStale = true;
        }
        if (!map.has(id)) {
          ctx.skippedIds.add(id);
        }
        continue;
      }

      // An unparseable label ABOVE the boundary is probably in range and is
      // kept. The same label BELOW it sits among older chats -- admitting it
      // is what put out-of-window chats into the run.
      if (state === "unknown" && sawStale && !pinned) {
        if (!map.has(id)) {
          ctx.skippedIds.add(id);
        }
        continue;
      }
      if (state === "fresh") {
        trailing = 0;
      }
      if (!map.has(id)) {
        map.set(id, {
          id: id,
          title: id,
          preview: v568(row),
          isGroup: v571(row),
          labels: v582(row)
        });
        ctx.kept++;
      }
    }
    ctx.trailingStale = trailing;
    return trailing;
  };
  /* ========================= end WCE-PATCH v1.8.2 ========================= */

  /* ============ WCE-PATCH v1.8.3: speed / filter-edge / stall-cap ============
   *
   * Scope is deliberately narrow -- three reported defects, nothing else.
   * This layer re-overrides v818 (the per-chat message loader) only.
   * Row parsing, chat-list windowing, formatting and the final range filter
   * (v784) are left exactly as v1.8.2 left them.
   *
   * S1  SPEED. v1.8.2 waited a flat `700 + idle*600` ms on every barren round,
   *     twice per round, up to MAX_IDLE (4 filtered / 8 unfiltered). A chat
   *     that has genuinely ended therefore cost ~12.8s of pure dead waiting
   *     before the loader accepted it -- multiplied by every chat in the run.
   *     Waits are now sized from the page latency actually observed in THIS
   *     chat (starting at ~500ms, growing only if the pane proves slow), and
   *     end-of-history is confirmed cheaply instead of waited out.
   *
   * S2  FILTER EDGE. The cutoff test stopped on the first single message older
   *     than the window, so one misparsed bubble truncated a chat; and once
   *     stopped, nothing prevented an extra scroll round from having already
   *     been paid for. The cutoff is now confirmed by two dated messages
   *     (WhatsApp pages in ~50 at a time, so this costs nothing in practice),
   *     is re-tested immediately after every single harvest, and aborts the
   *     round in flight rather than at the next loop top.
   *
   * S3  STALLS. "Tries to move up" forever was the nudge/retry escalation: it
   *     could re-attempt the same scroll 4-8 times, and a hung media fetch
   *     afterwards had no timeout at all, so one bad chat blocked the queue.
   *     A stall episode is now capped at 3 attempts (2 if the pane is inert),
   *     scroll-to-top has a fallback path for when WhatsApp fights the
   *     assignment, and the media phase is bounded per item and in aggregate.
   *     When the cap is hit the chat ends with what it has and the run moves
   *     on to the next chat instead of retrying in place.
   */

  v818 = async function (onProgress, shouldCancel, wantMedia, startDate) {
    var scroller = v713();
    if (!scroller) {
      return v752().map(function (e) {
        return e.message;
      });
    }
    var startMs = startDate ? startDate.getTime() : null;
    var filtered = startMs != null;
    var days = filtered ? Math.max(1, Math.round((Date.now() - startMs) / 86400000)) : 0;
    var seen = new Set();
    var pages = []; // pages loaded by scrolling up; newest-loaded last
    var initial = []; // what was on screen when we started
    var mediaQueue = [];
    var total = 0;
    var oldestTs = null; // running minimum -> O(1) cutoff test
    var belowCut = 0; // S2: dated messages confirmed older than the window
    __LOV_TRUNCATED__ = false;

    /* ---- S1: every wait is derived from this chat's observed latency ---- */
    var loadMs = 160; // ms between "scroll" and "page landed"
    function noteLatency(ms) {
      if (!isFinite(ms) || ms <= 0) {
        return;
      }
      // Track the slow side, but let a chat that speeds up recover.
      loadMs = ms > loadMs ? Math.min(ms, 4000) : Math.round(loadMs * 0.7 + ms * 0.3);
    }
    function waitMs(mult, floor) {
      return Math.max(floor || 260, Math.min(3200, Math.round(loadMs * mult)));
    }
    function harvest(prepend) {
      var fresh = [];
      var batch = v752();
      for (var i = 0; i < batch.length; i++) {
        var e = batch[i];
        if (seen.has(e.key)) {
          continue;
        }
        seen.add(e.key);
        var m = e.message;
        // Preserve actual WhatsApp message IDs for later voice queue playback.
        // Synthetic deduplication keys contain "|" and must never be sent to
        // the WhatsApp audio resolver.
        if ((m.media === "voice" || m.media === "audio") && !m.sourceMessageId && e.key && String(e.key).length <= 200 && !String(e.key).includes("|")) {
          m.sourceMessageId = String(e.key);
        }
        if (wantMedia && v802(m, startDate)) {
          mediaQueue.push({
            m: m,
            k: e.key
          });
        }
        if (m.tsMs != null) {
          if (oldestTs === null || m.tsMs < oldestTs) {
            oldestTs = m.tsMs;
          }
          if (filtered && m.tsMs < startMs) {
            belowCut++;
          }
        }
        fresh.push(m);
      }
      if (fresh.length > 0) {
        if (prepend) {
          pages.push(fresh);
        } else {
          for (var j = 0; j < fresh.length; j++) {
            initial.push(fresh[j]);
          }
        }
        total += fresh.length;
        onProgress(total);
      }
      return fresh.length;
    }
    function assemble() {
      var out = [];
      for (var p = pages.length - 1; p >= 0; p--) {
        var pg = pages[p];
        for (var i = 0; i < pg.length; i++) {
          out.push(pg[i]);
        }
      }
      for (var k = 0; k < initial.length; k++) {
        out.push(initial[k]);
      }
      return out;
    } // S2: two independent dated messages below the boundary, so a single
    // bubble whose stamp parsed wrong cannot truncate the chat. A real page
    // crossing the edge supplies dozens, so this never costs an extra round
    // except at the very start of a conversation -- where the loop is about
    // to stop anyway.
    function passedCutoff() {
      return filtered && belowCut >= 2 && oldestTs !== null && oldestTs < startMs;
    }
    function fire() {
      try {
        scroller.dispatchEvent(new Event("scroll", {
          bubbles: true
        }));
      } catch (e) {}
    } // S3: WhatsApp occasionally restores scrollTop from under the assignment,
    // which is what left the loader "trying to move up" with nothing to show
    // for it. Fall through to scrollTo, then to anchoring on the topmost
    // rendered bubble, before accepting that the pane will not move.
    function toTop() {
      try {
        scroller.scrollTop = 0;
      } catch (e) {}
      if (scroller.scrollTop > 4) {
        try {
          scroller.scrollTo({
            top: 0
          });
        } catch (e) {}
      }
      if (scroller.scrollTop > 4) {
        var rows = v685();
        if (rows.length > 0) {
          try {
            rows[0].scrollIntoView({
              block: "start",
              inline: "nearest"
            });
          } catch (e) {}
        }
      }
      fire();
    }
    async function nudge(n) {
      var step = Math.max(48, Math.min(360, Math.round(scroller.clientHeight * 0.2 * n)));
      try {
        scroller.scrollTop = step;
      } catch (e) {}
      fire();
      await v547(70);
      toTop();
    } // A spinner means the pane IS fetching -- a barren round is then latency,
    // not end-of-history, and must not be counted against the stall cap.
    function isFetching() {
      try {
        return !!scroller.querySelector("[role=\"progressbar\"], [data-icon=\"msg-time\"] ~ [role=\"progressbar\"], span[data-icon=\"status-time\"] + [role=\"progressbar\"], .lds-ring");
      } catch (e) {
        return false;
      }
    } // v1.8.2 read scroller.innerText here, which serializes the entire loaded
    // pane -- the single most expensive call in the loop, and it grew with
    // every page. The banner sits within the first few children of the
    // message list, so read only those.
    function atConversationTop() {
      try {
        if (scroller.scrollTop > 8) {
          return false;
        }
        var rows = v685();
        var host = rows.length > 0 && rows[0].parentElement ? rows[0].parentElement : scroller;
        var kids = host.children;
        var txt = "";
        for (var i = 0; i < kids.length && i < 6; i++) {
          txt += " " + (kids[i].textContent || "").slice(0, 240);
        }
        return /end-to-end encrypted|Messages and calls are|created (this )?group|You created this group|added you/i.test(txt);
      } catch (e) {
        return false;
      }
    } // Re-parse only when the pane actually changed, and bail the instant the
    // filter window is covered rather than finishing the wait first (S2).
    async function waitForGrowth(ms) {
      var n = harvest(true);
      if (n > 0) {
        return n;
      }
      var t0 = Date.now();
      var deadline = t0 + ms;
      var baseH = scroller.scrollHeight;
      var baseN = v685().length;
      while (Date.now() < deadline) {
        if (shouldCancel()) {
          return 0;
        }
        await v547(40);
        var curN = v685().length;
        if (scroller.scrollHeight !== baseH || curN !== baseN) {
          n = harvest(true);
          if (n > 0) {
            noteLatency(Date.now() - t0);
            return n;
          }
          baseH = scroller.scrollHeight;
          baseN = curN;
        }
      }
      return harvest(true);
    }
    /* ---- prime ---- */
    try {
      scroller.scrollTop = scroller.scrollHeight;
    } catch (e) {}
    fire();
    var primed = Date.now() + 2500;
    while (v685().length === 0 && Date.now() < primed) {
      await v547(25);
    }
    harvest(false);

    /* ---- S1/S3: ceilings ----
     * Halved against v1.8.2. These are escape hatches for a pathological
     * chat, not the normal path -- a chat that needs three minutes is not
     * slow, it is stuck, and every chat queued behind it is paying for it.
     */
    var BUDGET_MS = filtered ? Math.min(90000, 20000 + Math.max(1, days) * 2500) : 150000;
    var STALL_LIMIT = 3; // live-but-barren pane: 3 attempts, then move on
    var INERT_LIMIT = 2; // pane not even rendering: 2 is conclusive
    var SPINNER_GRACE = 2; // times a visible spinner may reset the counter

    var deadline = Date.now() + BUDGET_MS;
    var idle = 0;
    var grace = 0;
    var lastHeight = -1;
    for (var round = 0; round < 3000; round++) {
      if (shouldCancel()) {
        break;
      }
      if (passedCutoff()) {
        break;
      }
      if (Date.now() > deadline) {
        __LOV_TRUNCATED__ = !passedCutoff();
        break;
      }
      toTop();
      var grew = await waitForGrowth(waitMs(4, 420));
      if (grew > 0) {
        idle = 0;
        grace = 0;
        lastHeight = scroller.scrollHeight;
        if (passedCutoff()) {
          break;
        }
        continue;
      }
      var stable = scroller.scrollHeight === lastHeight;
      lastHeight = scroller.scrollHeight;

      // Cheapest possible exit: the pane is parked at the top, has not grown,
      // and the conversation-start banner is on screen. Nothing to retry.
      if (stable && atConversationTop()) {
        break;
      }

      // Still fetching -- this round was latency, not a stall. Bounded, so a
      // permanently visible spinner cannot loop forever.
      if (isFetching() && grace < SPINNER_GRACE) {
        grace++;
        var late = await waitForGrowth(waitMs(8, 1200));
        if (late > 0) {
          idle = 0;
          lastHeight = scroller.scrollHeight;
          if (passedCutoff()) {
            break;
          }
          continue;
        }
      }
      idle++;
      var limit = stable && !isFetching() ? INERT_LIMIT : STALL_LIMIT;
      if (idle >= limit) {
        __LOV_TRUNCATED__ = !passedCutoff() && !atConversationTop();
        break; // give up on THIS chat; the caller advances to the next one
      }

      // One nudge-and-retry per idle round, never more.
      await nudge(idle);
      grew = await waitForGrowth(waitMs(6 + idle * 2, 900));
      if (grew > 0) {
        idle = 0;
        grace = 0;
        lastHeight = scroller.scrollHeight;
        if (passedCutoff()) {
          break;
        }
      }
    }

    /* ---- media: bounded per item and in aggregate (S3) ---- */
    if (mediaQueue.length > 0 && !shouldCancel()) {
      var mediaDeadline = Date.now() + Math.min(120000, 15000 + mediaQueue.length * 400);
      function withTimeout(p, ms) {
        return new Promise(function (res) {
          var settled = false;
          var t = setTimeout(function () {
            if (!settled) {
              settled = true;
              res(undefined);
            }
          }, ms);
          Promise.resolve(p).then(function (v) {
            if (!settled) {
              settled = true;
              clearTimeout(t);
              res(v);
            }
          }, function () {
            if (!settled) {
              settled = true;
              clearTimeout(t);
              res(undefined);
            }
          });
        });
      }
      var idx = 0;
      async function worker() {
        while (true) {
          var k = idx++;
          if (k >= mediaQueue.length || shouldCancel()) {
            return;
          }
          if (Date.now() > mediaDeadline) {
            return;
          } // stop cleanly, keep the text
          var m = mediaQueue[k].m;
          if (m.mediaUrl) {
            m.mediaData = await withTimeout(v766(m.mediaUrl), 12000);
          } else if (m.media === "voice") {
            m.mediaData = await withTimeout(window.__lovDlAudio__ ? window.__lovDlAudio__(mediaQueue[k].k) : Promise.resolve(), 12000);
          }
          if (m.media === "voice" && m.durationSeconds == null && m.mediaData) {
            try {
              var probe = await new Promise(function (res) {
                var a = new Audio();
                var fin = false;
                function done(v) {
                  if (!fin) {
                    fin = true;
                    res(v);
                  }
                }
                a.onloadedmetadata = function () {
                  done(isFinite(a.duration) ? a.duration : null);
                };
                a.onerror = function () {
                  done(null);
                };
                setTimeout(function () {
                  done(null);
                }, 1800);
                a.src = m.mediaData;
              });
              if (probe != null) {
                m.durationSeconds = Math.round(probe);
                m.mediaDuration = __lovFmtDuration(m.durationSeconds);
              }
            } catch (e) {}
          }
        }
      }
      await Promise.all(Array.from({
        length: Math.min(6, mediaQueue.length)
      }, worker));
    }
    try {
      scroller.scrollTop = scroller.scrollHeight;
    } catch (e) {}
    return assemble();
  };
  /* ========================= end WCE-PATCH v1.8.3 ========================= */
})();