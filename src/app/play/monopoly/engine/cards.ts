import type { Card } from './types';

export const COMMUNITY_CHEST: Card[] = [
  { id:'cc1',  deck:'community', text:'Advance to Go. Collect $200.',                         action:{type:'advance_go'} },
  { id:'cc2',  deck:'community', text:'Bank error in your favor. Collect $200.',              action:{type:'collect',amount:200} },
  { id:'cc3',  deck:'community', text:'Doctor fee. Pay $50.',                                 action:{type:'pay',amount:50} },
  { id:'cc4',  deck:'community', text:'From sale of stock you get $50.',                      action:{type:'collect',amount:50} },
  { id:'cc5',  deck:'community', text:'Get Out of Jail Free.',                                action:{type:'get_out_of_jail'} },
  { id:'cc6',  deck:'community', text:'Go to Jail.',                                          action:{type:'go_to_jail'} },
  { id:'cc7',  deck:'community', text:'Holiday Fund matures. Receive $100.',                  action:{type:'collect',amount:100} },
  { id:'cc8',  deck:'community', text:'Income tax refund. Collect $20.',                      action:{type:'collect',amount:20} },
  { id:'cc9',  deck:'community', text:"It is your birthday. Collect $10 from every player.",  action:{type:'collect_from_players',amount:10} },
  { id:'cc10', deck:'community', text:'Life insurance matures. Collect $100.',                action:{type:'collect',amount:100} },
  { id:'cc11', deck:'community', text:'Pay hospital fees of $100.',                           action:{type:'pay',amount:100} },
  { id:'cc12', deck:'community', text:'Pay school fees of $50.',                              action:{type:'pay',amount:50} },
  { id:'cc13', deck:'community', text:'Receive $25 consultancy fee.',                         action:{type:'collect',amount:25} },
  { id:'cc14', deck:'community', text:'Street repairs: pay $40 per house, $115 per hotel.',   action:{type:'pay_per_house',perHouse:40,perHotel:115} },
  { id:'cc15', deck:'community', text:'You have won second prize in a beauty contest. Collect $10.', action:{type:'collect',amount:10} },
  { id:'cc16', deck:'community', text:'You inherit $100.',                                    action:{type:'collect',amount:100} },
];

export const CHANCE: Card[] = [
  { id:'ch1',  deck:'chance', text:'Advance to Boardwalk.',                                   action:{type:'move',to:39} },
  { id:'ch2',  deck:'chance', text:'Advance to Go. Collect $200.',                            action:{type:'advance_go'} },
  { id:'ch3',  deck:'chance', text:'Advance to Illinois Ave.',                                action:{type:'move',to:24} },
  { id:'ch4',  deck:'chance', text:'Advance to St. Charles Place.',                           action:{type:'move',to:11} },
  { id:'ch5',  deck:'chance', text:'Advance to nearest railroad.',                            action:{type:'move_to_nearest',squareType:'railroad'} },
  { id:'ch6',  deck:'chance', text:'Advance to nearest railroad (pay double rent).',          action:{type:'move_to_nearest',squareType:'railroad'} },
  { id:'ch7',  deck:'chance', text:'Advance token to nearest utility.',                       action:{type:'move_to_nearest',squareType:'utility'} },
  { id:'ch8',  deck:'chance', text:'Bank pays you dividend of $50.',                          action:{type:'collect',amount:50} },
  { id:'ch9',  deck:'chance', text:'Get Out of Jail Free.',                                   action:{type:'get_out_of_jail'} },
  { id:'ch10', deck:'chance', text:'Go back 3 spaces.',                                       action:{type:'go_back',spaces:3} },
  { id:'ch11', deck:'chance', text:'Go to Jail.',                                             action:{type:'go_to_jail'} },
  { id:'ch12', deck:'chance', text:'Make general repairs: $25 per house, $100 per hotel.',    action:{type:'pay_per_house',perHouse:25,perHotel:100} },
  { id:'ch13', deck:'chance', text:'Pay poor tax of $15.',                                    action:{type:'pay',amount:15} },
  { id:'ch14', deck:'chance', text:'Take a trip to Reading Railroad.',                        action:{type:'move',to:5} },
  { id:'ch15', deck:'chance', text:'Take a walk on the Boardwalk. Advance to Boardwalk.',     action:{type:'move',to:39} },
  { id:'ch16', deck:'chance', text:'You have been elected Chairman of the Board. Pay each player $50.', action:{type:'pay_to_players',amount:50} },
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
