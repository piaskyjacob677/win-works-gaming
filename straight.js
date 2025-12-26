define(["core/class", "system/security", "system/log", "util/util", "util/message", "ui/ui", "sports/sports", "language/language", "util/http", "ui/header", "ui/center"], (function (e, t, a, i, n, o, r, l, s, c, m) {
    "use strict";
    return a = new a,
        i = new i,
        n = new n,
        o = new o,
        r = new r,
        l = new l,
        s = new s,
        c = new c,
        m = new m,
        e.extend({
            list: [],
            path: i.apiPath + "api/WagerSport/",
            description: "",
            parent: {},
            jump: !0,
            init: function () { },
            data: function (e) {
                var t = ""
                    , a = {
                        content: $('.slide-up[data-panel="bets"]')
                    }
                    , n = $.extend(a, e)
                    , o = new (require("sports/line/line"))
                    , l = e.list
                    , s = []
                    , c = {}
                    , m = 0
                    , d = n.content;
                n.content.find('.content-bets [data-field="risk"]').trigger("input");
                for (var p = 0; p < l.length; p++) {
                    var f = l[p]
                        , u = o.items.filter((function (e) {
                            return e.key === f.position
                        }
                        ))[0]
                        , g = d.find('[data-position="' + f.position + '"]')
                        , y = i.getTeamByPosition(u).team
                        , T = i.concat.NUM + i.getTeamByPosition(u).rot;
                    u.info.special === i.typePeriod.PROP ? t += u.info.header[9] + " - #" + u.info.header[10] + " - #" + u.info.header[7] + " - #" + u.info.header[0] + " - " + u.data.ContestantName.trim() + " " + o.getLineDescription({
                        item: u
                    }) + " for  Game" : t += u.data.SportType.toString().trim() + " " + T + " " + y + " " + o.getLineDescription({
                        item: u
                    }) + " - For " + u.data.PeriodDescription + " "
                }
                this.description = t;
                var A = {
                    team1: "",
                    team2: "",
                    rot1: "",
                    rot2: ""
                };
                for (p = 0; p < l.length; p++) {
                    f = l[p],
                        u = o.items.filter((function (e) {
                            return e.key === f.position
                        }
                        ))[0],
                        g = d.find('[data-position="' + f.position + '"]');
                    if (u.valid) {
                        if (m = p + 1,
                            u.info.special === i.typePeriod.PROP) {
                            var k = u.info.header[9] + " - #" + u.info.header[10] + " - #" + u.info.header[7] + " - #" + u.info.header[0] + " - " + u.data.ContestantName.trim() + " " + i.setSymbol({
                                str: u.data.MoneyLine
                            }) + " for  Game";
                            A = {
                                team1: u.data.ContestantName.trim(),
                                team2: u.info.header[10],
                                rot1: u.data.ContestantNum,
                                rot2: u.data.ContestantNum,
                                line: i.setSymbol({
                                    str: u.data.MoneyLine
                                }),
                                buy: !1,
                                point: 0
                            };
                            var S = {
                                date: moment(new Date).format("YYYY-MM-DD"),
                                minPicks: 1,
                                totalPicks: 1,
                                maxPayOut: 0,
                                wagerCount: m,
                                riskAmount: g.find('[data-info="pay"] [data-field="risk"]').val(),
                                winAmount: g.find('[data-info="pay"] [data-field="win"]').val(),
                                description: k,
                                lineType: "C",
                                freePlay: i.BET.TYPE.STRAIGHT.freePlay,
                                agentID: r.accountInfo.AgentID,
                                currencyCode: r.accountInfo.CurrencyCode,
                                creditAcctFlag: r.accountInfo.CreditAcctFlag,
                                playNumber: m
                            };
                            c = {
                                customerID: r.ID,
                                sportType: u.info.header[9],
                                wagerType: i.BET.TYPE.STRAIGHT.char,
                                lineType: i.BET.SUB_TYPE.MONEY.val,
                                docNum: Math.floor(1e8 * Math.random() + 1),
                                gameNum: u.info.header[4],
                                wagerCount: m,
                                gameDate: u.info.header[3],
                                contestDesc: u.info.header[0],
                                contestantName: u.data.ContestantName,
                                priceType: i.oddSelected,
                                finalToBase: u.data.ToBase,
                                finalMoney: u.data.MoneyLine,
                                finalDecimal: u.data.DecimalOdds,
                                riskAmount: g.find('[data-info="pay"] [data-field="risk"]').val(),
                                winAmount: g.find('[data-info="pay"] [data-field="win"]').val(),
                                finalNumerator: u.data.Numerator,
                                finalDenominator: u.data.Denominator,
                                store: r.accountInfo.Store,
                                office: r.accountInfo.Office,
                                custProfile: r.accountInfo.CustProfile,
                                contestType: u.info.header[9],
                                contestType2: u.info.header[10],
                                contestType3: u.info.header[7],
                                contestantNum: u.data.ContestantNum,
                                percentBook: r.accountInfo.PercentBook,
                                volumeAmount: i.getVolumenAmount({
                                    risk: 100 * parseFloat(g.find('[data-info="pay"] [data-field="risk"]').val()),
                                    win: 100 * parseFloat(g.find('[data-info="pay"] [data-field="win"]').val())
                                }),
                                origPrice: u.data.MoneyLine,
                                origDecimal: u.data.DecimalOdds,
                                origNumerator: parseFloat(u.data.Numerator),
                                origDenominator: parseFloat(u.data.Denominator),
                                thresholdType: 0,
                                thresholdUnits: 0,
                                thresholdLine: 0,
                                currencyCode: r.accountInfo.CurrencyCode,
                                valueDate: moment(new Date).format("YYYY-MM-DD"),
                                agentID: r.accountInfo.AgentID,
                                wager: S,
                                extra: A,
                                printing: r.isPrintingAccount()
                            }
                        } else {
                            var P = u.data.SportType.toString().trim().toUpperCase()
                                , I = o.getEasternLine({
                                    lineType: u.info.type,
                                    sportType: P
                                })
                                , v = "N"
                                , h = "N";
                            if (u.info.type === i.BET.SUB_TYPE.MONEY.val)
                                v = (g = d.find('[data-position="' + f.position + '"]')).find(".pitcher-area #flag-pit-1").val(),
                                    h = g.find(".pitcher-area #flag-pit-2").val();
                            u.info.type !== i.BET.SUB_TYPE.SPREAD.val && u.info.type !== i.BET.SUB_TYPE.TOTAL.val && u.info.type !== i.BET.SUB_TYPE.TEAM_TOTAL.val || (v = "Y",
                                h = "Y");
                            y = i.getTeamByPosition(u).chosenTeamID;
                            var D = i.getTeamByPosition(u).team
                                , E = (T = i.concat.NUM + i.getTeamByPosition(u).rot,
                                    0);
                            u.info.type === i.BET.SUB_TYPE.TOTAL.val && (E = o.totalFormat({
                                line: u.data,
                                team: u.info.team
                            }).points),
                                u.info.type === i.BET.SUB_TYPE.TEAM_TOTAL.val && (E = o.teamTotalFormat({
                                    line: u.data,
                                    team: u.info.team,
                                    totalOU: u.info.totalOU
                                }).points);
                            var R = 0
                                , w = 0
                                , L = 0
                                , O = 0
                                , b = 0
                                , N = 0
                                , F = 0
                                , B = 0
                                , M = 0
                                , C = 0
                                , U = "";
                            switch (u.info.type) {
                                case i.BET.SUB_TYPE.SPREAD.val:
                                    if (C = o.spreadFormat({
                                        line: u.data,
                                        team: u.info.team
                                    }).line,
                                        R = o.spreadFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).price,
                                        u.selectPoint > 0)
                                        R = u.points[parseInt(u.selectPoint)].american.juice,
                                            (Y = u.points[parseInt(u.selectPoint)].american.buying) > 0 && (U = "buying " + i.isDecimal({
                                                number: Y
                                            }) + " ");
                                    w = o.spreadFormat({
                                        line: u.data,
                                        team: u.info.team
                                    }).decimal,
                                        L = o.spreadFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).numerator,
                                        O = o.spreadFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).denominator,
                                        b = o.spreadFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).decimal,
                                        N = o.spreadFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).numerator,
                                        F = o.spreadFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).denominator,
                                        B = o.spreadFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).line,
                                        M = o.spreadFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).price;
                                    break;
                                case i.BET.SUB_TYPE.TOTAL.val:
                                    var Y;
                                    if (R = o.totalFormat({
                                        line: u.data,
                                        team: u.info.team
                                    }).price,
                                        u.selectPoint > 0)
                                        R = u.points[parseInt(u.selectPoint)].american.juice,
                                            (Y = u.points[parseInt(u.selectPoint)].american.buying) > 0 && (U = "buying " + i.isDecimal({
                                                number: Y
                                            }) + " ");
                                    w = o.totalFormat({
                                        line: u.data,
                                        team: u.info.team
                                    }).decimal,
                                        L = o.totalFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).numerator,
                                        O = o.totalFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).denominator,
                                        b = o.totalFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).decimal,
                                        N = o.totalFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).numerator,
                                        F = o.totalFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).denominator,
                                        B = o.totalFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).points,
                                        M = o.totalFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).price;
                                    break;
                                case i.BET.SUB_TYPE.MONEY.val:
                                    R = o.moneyFormat({
                                        line: u.data,
                                        team: u.info.team
                                    }).price,
                                        w = o.moneyFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).decimal,
                                        L = o.moneyFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).numerator,
                                        O = o.moneyFormat({
                                            line: u.data,
                                            team: u.info.team
                                        }).denominator,
                                        b = o.moneyFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).decimal,
                                        N = o.moneyFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).numerator,
                                        F = o.moneyFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).denominator,
                                        B = o.moneyFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).line,
                                        M = o.moneyFormat({
                                            line: u.native,
                                            team: u.info.team
                                        }).price;
                                    break;
                                case i.BET.SUB_TYPE.TEAM_TOTAL.val:
                                    R = o.teamTotalFormat({
                                        line: u.data,
                                        team: u.info.team,
                                        totalOU: u.info.totalOU
                                    }).priceAmerican,
                                        w = o.teamTotalFormat({
                                            line: u.data,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).decimal,
                                        L = o.teamTotalFormat({
                                            line: u.data,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).numerator,
                                        O = o.teamTotalFormat({
                                            line: u.data,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).denominator,
                                        b = o.teamTotalFormat({
                                            line: u.native,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).decimal,
                                        N = o.teamTotalFormat({
                                            line: u.native,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).numerator,
                                        F = o.teamTotalFormat({
                                            line: u.native,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).denominator,
                                        B = o.teamTotalFormat({
                                            line: u.native,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).points,
                                        M = o.teamTotalFormat({
                                            line: u.native,
                                            team: u.info.team,
                                            totalOU: u.info.totalOU
                                        }).price
                            }
                            u.selectPoint > 0 && (C = u.points[parseInt(u.selectPoint)].american.line),
                                u.selectPoint > 0 && (E = u.points[parseInt(u.selectPoint)].american.line),
                                t = u.data.SportType.toString().trim() + " " + T + " " + D.toString().trim() + " " + o.getLineDescription({
                                    item: u
                                }) + " - " + U + "For " + u.data.PeriodDescription;
                            S = {
                                date: moment(new Date).format("YYYY-MM-DD"),
                                minPicks: 1,
                                totalPicks: 1,
                                maxPayOut: 0,
                                wagerCount: m,
                                riskAmount: g.find('[data-info="pay"] [data-field="risk"]').val(),
                                winAmount: g.find('[data-info="pay"] [data-field="win"]').val(),
                                description: t,
                                lineType: u.info.type,
                                team: u.info.team,
                                freePlay: i.BET.TYPE.STRAIGHT.freePlay,
                                agentID: r.accountInfo.AgentID,
                                currencyCode: r.accountInfo.CurrencyCode,
                                creditAcctFlag: r.accountInfo.CreditAcctFlag,
                                playNumber: m
                            };
                            A = {
                                team1: u.data.Team1ID,
                                team2: u.data.Team2ID,
                                rot1: u.data.Team1RotNum,
                                rot2: u.data.Team2RotNum,
                                line: g.find('[data-field="line"]').html().toString().trim(),
                                buy: u.selectPoint > 0,
                                point: u.selectPoint > 0 ? u.points[parseInt(u.selectPoint)].american.line : 0
                            };
                            c = {
                                customerID: r.ID,
                                docNum: Math.floor(1e8 * Math.random() + 1),
                                wagerType: i.BET.TYPE.STRAIGHT.char,
                                gameNum: u.data.GameNum,
                                wagerCount: m,
                                gameDate: u.data.GameDateTime,
                                buyingFlag: u.data.PreventPointBuyingFlag,
                                extraGames: r.accountInfo.AllowBuyPointsExtraGames,
                                sportType: u.data.SportType,
                                sportSubType: u.data.SportSubType,
                                lineType: u.info.type,
                                adjSpread: u.info.type === i.BET.SUB_TYPE.SPREAD.val ? C : 0,
                                adjTotal: u.info.type === i.BET.SUB_TYPE.TOTAL.val || u.info.type === i.BET.SUB_TYPE.TEAM_TOTAL.val ? E : 0,
                                totalPointsOU: u.info.totalOU,
                                priceType: i.oddSelected,
                                finalMoney: R,
                                finalDecimal: w,
                                finalNumerator: L,
                                finalDenominator: O,
                                chosenTeamID: y,
                                riskAmount: parseFloat(g.find('[data-info="pay"] [data-field="risk"]').val()),
                                winAmount: parseFloat(g.find('[data-info="pay"] [data-field="win"]').val()),
                                store: r.accountInfo.Store,
                                office: r.accountInfo.Office,
                                custProfile: u.data.CustProfile,
                                periodNumber: u.data.PeriodNumber,
                                periodDescription: u.data.PeriodDescription,
                                oddsFlag: "Y" === v && "Y" === h ? "N" : "Y",
                                listedPitcher1: u.data.ListedPitcher1,
                                pitcher1ReqFlag: v,
                                listedPitcher2: u.data.ListedPitcher2,
                                pitcher2ReqFlag: h,
                                percentBook: r.accountInfo.PercentBook,
                                volumeAmount: i.getVolumenAmount({
                                    risk: 100 * parseFloat(g.find('[data-info="pay"] [data-field="risk"]').val()),
                                    win: 100 * parseFloat(g.find('[data-info="pay"] [data-field="win"]').val())
                                }),
                                currencyCode: r.accountInfo.CurrencyCode,
                                date: moment(new Date).format("YYYY-MM-DD"),
                                agentID: r.accountInfo.AgentID,
                                easternLine: I,
                                origPrice: R,
                                origDecimal: b,
                                origNumerator: N,
                                origDenominator: F,
                                creditAcctFlag: r.accountInfo.CreditAcctFlag,
                                wager: S,
                                itemNumber: 1,
                                wagerNumber: 0,
                                origSpread: B,
                                origTotal: B,
                                origMoney: M,
                                extra: A,
                                status: u.data.Status,
                                printing: r.isPrintingAccount()
                            };
                            r.accountInfo.BaseballAction === i.pitchers.FIXED && (c.oddsFlag = "N",
                                c.pitcher1ReqFlag = "N",
                                c.pitcher2ReqFlag = "N")
                        }
                        s.push(c)
                    }
                }
                s.length > 0 && this.insert({
                    list: s,
                    content: n.content,
                    delay: n.delay,
                    keyLine: l
                })
            },
            insert: function (e) {
                var t = {
                    content: $('.slide-up[data-panel="bets"]')
                }
                    , s = $.extend(t, e)
                    , d = this
                    , p = new (require("sports/line/line"))
                    , f = new (require("sports/wager/wager"))
                    , u = new (require("sports/limit/limit"))
                    , g = s.content;
                if (r.isBetSlip() && p.block.STRAIGHT && !r.useBetSlipV2())
                    return n.showMsg({
                        title: l.get({
                            key: "L-22"
                        }),
                        text: l.get({
                            key: "L-722"
                        }),
                        icon: n.type.WARNING.icon,
                        time: 8e3
                    }),
                        !1;
                for (var y = f.operationSelector(), T = {
                    customerID: r.ID,
                    list: JSON.stringify(e.list),
                    agentView: i.isPlaceLateBetAgent(),
                    operation: y.request,
                    agToken: y.agToken,
                    delay: JSON.stringify(s.delay)
                }, A = !0, k = 0; k < e.list.length; k++) {
                    var S = e.list[k];
                    (null === S.wager.riskAmount || null === S.wager.winAmount || 0 === parseInt(S.wager.riskAmount) || 0 === parseInt(S.wager.winAmount) || isNaN(parseInt(S.wager.riskAmount)) || isNaN(parseInt(S.wager.winAmount))) && (A = !1)
                }
                if (!A)
                    return n.showMsg({
                        title: l.get({
                            key: "L-21"
                        }),
                        text: l.get({
                            key: "L-711"
                        }),
                        icon: n.type.ERROR.icon,
                        time: 3e4
                    }),
                        f.availableActions({
                            content: g
                        }),
                        !1;
                $.ajax({
                    url: d.path + T.operation,
                    cache: !1,
                    data: T,
                    type: "POST",
                    success: function (t) {
                        if (r.accountInfo.DefaultSiteSkin === i.skins.VISOR_A && (i.__proto__.preSaveCall = !0),
                            t.STATUS.STATE === i.status.OK) {
                            var y = t.STATUS.DOC;
                            a.writeDetail({
                                customerID: r.ID,
                                data: JSON.stringify(e.list),
                                ticket: y
                            });
                            if ($('.slide-up[data-panel="quick-bet"]').is(":visible") && " Quick Bet ",
                                u.clearFreePlay({
                                    wagerType: i.BET.TYPE.STRAIGHT
                                }),
                                i.isSiteReportAfterWager())
                                return require(["sports/report/pending"], (function (e) {
                                    (new e).setOptionsAfterWager({
                                        content: s.content,
                                        data: t
                                    })
                                }
                                )),
                                    !1;
                            r.isBetSlip() ? (p.__proto__.block.STRAIGHT = !0,
                                f.availableActions({
                                    content: g
                                })) : (g.find('[data-field="ticket"]').html(y),
                                    g.find(".betting-stage").addClass("hide"),
                                    g.find(".report-stage").removeClass("hide")),
                                i.bridge && a.write({
                                    customerID: i.manager,
                                    description: i.manager + " " + l.get({
                                        key: "L-698"
                                    }),
                                    additional: l.get({
                                        key: "L-38"
                                    }) + " : " + y + " | " + r.ID
                                });
                            var T = 1e3;
                            r.isBetSlip && (T = 0),
                                require(["sports/report/pending"], (function (e) {
                                    var t = new e;
                                    o.getSvgLoader({
                                        content: g.find(".content-report")
                                    }),
                                        setTimeout((function () {
                                            t.get({
                                                ticketNumber: y,
                                                operation: "getPendingByTicket",
                                                content: g.find(".content-report"),
                                                smallView: !0
                                            })
                                        }
                                        ), T)
                                }
                                )),
                                g.find('[data-action="go-pending"]').off("click").on("click", (function () {
                                    c.callPending(),
                                        p.clearAll()
                                }
                                )),
                                g.find('[data-action="go-home"]').off("click").on("click", (function () {
                                    $("body").hasClass("view-small") && c.goHome(),
                                        p.clearAll()
                                }
                                )),
                                g.find('[data-action="go-schedule"]').off("click").on("click", (function () {
                                    p.clearAll()
                                }
                                )),
                                setTimeout((function () {
                                    r.getAccountInfo()
                                }
                                ), i.lagBD),
                                r.useBetSlipV2() ? p.keepSelections() : r.isDSI() || r.accountInfo.DefaultSiteSkin === i.skins.VISOR_A ? (p.clearAll(),
                                    r.accountInfo.DefaultSiteSkin !== i.skins.VISOR_A && p.refreshLines()) : p.clearAll({
                                        triggerClose: !1,
                                        setWager: !0
                                    }),
                                i.layout.IS_GROUP_A({
                                    skin: r.accountInfo.DefaultSiteSkin
                                }) && $('[data-panel="quick-bet"]').is(":visible") && $('[data-panel="quick-bet"] .report-stage').is(":visible") && m.closeSlideListeners()
                        } else
                            switch (t.STATUS.TYPE) {
                                case i.state.GRADED:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-22"
                                        }),
                                        text: l.get({
                                            key: "L-94"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.GLOBAL_PAYOUT:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: t.STATUS.MSG,
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.CHECK_LINE:
                                case i.state.INVALID_ODDS:
                                    d.callCheckLine({
                                        Line: p,
                                        Wager: f,
                                        slide: g,
                                        list: e.keyLine
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.INACTIVE:
                                    r.disabledAccount();
                                    break;
                                case i.state.LIMIT:
                                    r.isDSI() ? n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: t.STATUS.MSG,
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }) : n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-715"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        }),
                                        r.getAccountInfo(),
                                        r.isBetSlip() || m.closeSlide();
                                    break;
                                case i.state.EARlY_LIMIT:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: t.STATUS.MSG,
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        }),
                                        r.isBetSlip() || m.closeSlide();
                                case i.state.CAPTCHA:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1361"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.ERROR_INVALID_SIGNATURE:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1416"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.PITCHERS:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1417"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.PERIOD_NOT_AVAILABLE:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1418"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.CONTEST_ML:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1419"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.CONTEST_MAX_PRICE:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1420"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.MARKET_UNAVAILABLE:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1421"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                case i.state.INVALID_FREEPLAY:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-1439"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        });
                                    break;
                                default:
                                    n.showMsg({
                                        title: l.get({
                                            key: "L-21"
                                        }),
                                        text: l.get({
                                            key: "L-616"
                                        }),
                                        icon: n.type.ERROR.icon,
                                        time: 1e4,
                                        append: !0
                                    }),
                                        f.availableActions({
                                            content: g
                                        })
                            }
                    },
                    error: function (e, t, i) {
                        if (n.showMsg({
                            title: l.get({
                                key: "L-21"
                            }),
                            text: l.get({
                                key: "L-95"
                            }),
                            icon: n.type.ERROR.icon,
                            time: 1e4
                        }),
                            f.availableActions({
                                content: g
                            }),
                            e.status > 0) {
                            var o = Date.now();
                            a.write({
                                customerID: r.ID,
                                description: "PLACE ERROR STRAIGHT",
                                additional: "STATUS:" + e.status + ", ID: " + o
                            }),
                                a.writeErr({
                                    customerID: r.ID,
                                    data: T,
                                    info: o,
                                    ticket: -20
                                })
                        }
                    }
                })
            },
            callCheckLine: function (e) {
                var t = e.Line
                    , a = e.Wager
                    , o = []
                    , s = e.slide;
                n.showMsg({
                    title: l.get({
                        key: "L-22"
                    }),
                    text: l.get({
                        key: "L-93"
                    }),
                    icon: n.type.WARNING.icon,
                    time: 3500
                });
                var c = t.multiple;
                0 === t.multiple.length && (e.list[0].key = e.list[0].position,
                    c = e.list);
                for (var m = 0; m < c.length; m++) {
                    var d = c[m].key
                        , p = s.find('[data-position="' + d + '"]')
                        , f = t.items.filter((function (e) {
                            return e.key === d
                        }
                        ))[0];
                    if (f.info.special === i.typePeriod.PROP) {
                        var u = f.info.header[9] + " - #" + f.info.header[10] + " - #" + f.info.header[7] + " - #" + f.info.header[0] + " - " + f.data.ContestantName.trim() + " " + t.getLineDescription({
                            item: f
                        }) + " for  Game";
                        o.push({
                            position: d,
                            customerID: r.ID,
                            gameNum: f.info.header[4],
                            contestantNum: f.data.ContestantNum,
                            periodNumber: 0,
                            store: i.clearSpaces(r.accountInfo.Store),
                            status: i.status.OPEN,
                            profile: i.clearSpaces(r.accountInfo.CustProfile),
                            periodType: i.typePeriod.PROP,
                            description: u,
                            risk: p.find('[data-field="risk"]').val(),
                            win: p.find('[data-field="win"]').val(),
                            wagerType: "C"
                        })
                    } else {
                        var g = i.getTeamByPosition(f).team
                            , y = i.concat.NUM + i.getTeamByPosition(f).rot;
                        u = f.data.SportType.toString().trim() + " " + y + " " + g + " " + t.getLineDescription({
                            item: f
                        }) + " - For " + f.data.PeriodDescription + " ";
                        o.push({
                            position: d,
                            gameNum: f.data.GameNum,
                            contestantNum: f.data.ContestantNum,
                            periodNumber: f.data.PeriodNumber,
                            store: i.clearSpaces(r.accountInfo.Store),
                            status: f.data.Status,
                            profile: i.clearSpaces(r.accountInfo.CustProfile),
                            periodType: f.data.PeriodDescription,
                            description: u,
                            risk: p.find('[data-field="risk"]').val(),
                            win: p.find('[data-field="win"]').val(),
                            wagerType: f.info.type
                        })
                    }
                }
                a.checkWagerLine({
                    list: o,
                    content: s,
                    checkLine: !0,
                    Line: t
                }).flag || (a.availableActions({
                    content: s
                }),
                    t.reloadPayOuts({
                        content: s
                    }),
                    t.buyPointsAction({
                        content: s
                    }))
            }
        })
}
));
