export const exportAudio = {
    button: {
        title: "აუდიოს შენახვა",
        description: "შეინახეთ კომპოზიცია სხვადასხვა ფორმატში"
    },

    formats: {
        title: "ფორმატის არჩევა",
        formats: {
            wav: {
                button: {
                    title: "WAV აუდიო (.wav)",
                    description:
                        "სიმღერის ექსპორტი ცვლილებებით .wav აუდიო ფაილის სახით"
                },
                options: {
                    title: "WAV ექსპორტის ვარიანტები",
                    description:
                        "მიმდინარე MIDI ფაილის ექსპორტი WAV ფორმატში, სინთეზატორის კონტროლერის მეშვეობით განხორციელებული ყველა ცვლილების გამოყენებით.",
                    confirm: "Export",
                    normalizeVolume: {
                        title: "ხმის ნორმალიზება",
                        description:
                            "შეინარჩუნეთ ხმა ერთსა და იმავე დონეზე, მიუხედავად იმისა, თუ რამდენად ხმამაღალია ან ჩუმი MIDI. რეკომენდებულია."
                    },
                    additionalTime: {
                        title: "დამატებითი დრო (წმ)",
                        description:
                            "დამატებითი დრო სიმღერის ბოლოს, რათა ხმა გაქრეს. (წამები)"
                    },
                    sampleRate: {
                        title: "დისკრეტიზაციის სიხშირე",
                        description:
                            "გამომავალი ფაილის ნიმუშის სიხშირე ჰერცებში. დატოვეთ უცვლელი, თუ არ იცით რას აკეთებთ."
                    },

                    separateChannels: {
                        title: "ცალკეული არხები",
                        description:
                            "შეინახეთ თითოეული არხი ცალკე ფაილად. სასარგებლოა ისეთი ფუნქციებისთვის, როგორიცაა ოსცილოსკოპის ჩვენება. გაითვალისწინეთ, რომ ეს გამორთავს რევერბერაციას და ქორუსს.",
                        saving: {
                            title: "არხების ფაილები",
                            save: "არხ {0}-ის შენახვა",
                            saveAll: "ყველას შენახვა"
                        }
                    },
                    loopCount: {
                        title: "ციკლის რაოდენობა",
                        description: "სიმღერის გამეორების რაოდენობა"
                    }
                },
                exportMessage: {
                    message: "WAV აუდიოს ექსპორტი...",
                    addingEffects: "ეფექტების დამატება...",
                    estimated: "დარჩენილი:",
                    convertWav: "მიმდინარეობს wav-ში კონვერტაცია..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description:
                        "ექსპორტირება გაუკეთეთ MIDI ფაილს კონტროლერისა და ინსტრუმენტის ცვლილებებით"
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "SoundFont2 ფაილის ექსპორტი"
                },

                options: {
                    title: "SF ექსპორტის ვარიანტები",
                    confirm: "ექსპორტი",
                    trim: {
                        title: "მოჭრა",
                        description:
                            "Soundfont-ის ექსპორტი მხოლოდ იმ ინსტრუმენტებითა და სემპლებით, რომლებსაც MIDI ფაილი იყენებს"
                    },
                    compress: {
                        title: "შეკუმშვა",
                        description:
                            "არაკომპრესირებული ნიმუშების შეკუმშვა დანაკარგიანი Ogg Vorbis შეკუმშვით. მნიშვნელოვნად ამცირებს ფაილის ზომას." +
                            "თუ Soundfont უკვე შეკუმშულია, ის არ განკუმშდება, მაშინაც კი, თუ ეს პარამეტრი გამორთულია"
                    },
                    quality: {
                        title: "შეკუმშვის ხარისხი",
                        description:
                            "შეკუმშვის ხარისხი. რაც უფრო მაღალია, მით უკეთესი"
                    }
                },

                exportMessage: {
                    message: "SoundFont-ის ექსპორტი..."
                }
            },

            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "SoundFont-ის ექსპორტი DLS-ის სახით"
                },
                warning: {
                    title: "DLS ექსპორტის გაფრთხილება",
                    message:
                        "DLS ექსპორტი შეზღუდულია და შეიძლება გამოიწვიოს დაზიანებული ფაილები დიდი და რთული SoundFonts-ის გამოყენებით.",
                    details: "მეტი ინფორმაცია",
                    confirm: "ექსპორტი მაინც"
                },

                exportMessage: {
                    message: "DLS-ის ექსპორტი..."
                }
            },

            rmidi: {
                button: {
                    title: "ჩაშენებული MIDI (.rmi)",
                    description:
                        "ჩაშენებული ამოჭრილი soundfont-ით მოდიფიცირებული MIDI ერთიან ფაილად ექსპორტირება მოახდინეთ. " +
                        "გაითვალისწინეთ, რომ ეს ფორმატი ფართოდ არ არის მხარდაჭერილი"
                },

                progress: {
                    title: "ჩაშენებული MIDI-ს ექსპორტი...",
                    loading: "Soundfont-ის და MIDI-ს ჩატვირთვა...",
                    modifyingMIDI: "MIDI-ს მოდიფიკაცია...",
                    modifyingSoundfont:
                        "Soundfont-ის მოჭრა... (ამას შეიძლება ცოტა ხანი დასჭირდეს!)",
                    saving: "RMIDI-ს შენახვა...",
                    done: "დასრულდა!"
                },

                options: {
                    title: "RMIDI ექსპორტის ვარიანტები",
                    description:
                        "ჩადეთ მიმდინარე SoundFont + MIDI როგორც RMIDI და გამოიყენეთ სინთეზატორის კონტროლერის მეშვეობით განხორციელებული ყველა ცვლილება.",
                    confirm: "ექსპორტი",
                    compress: {
                        title: "შეკუმშვა",
                        description:
                            "შეკუმშეთ Soundfont დანაკარგიანი Ogg Vorbis შეკუმშვით. მნიშვნელოვნად ამცირებს ფაილის ზომას. რეკომენდებულია."
                    },
                    quality: {
                        title: "შეკუმშვის ხარისხი",
                        description:
                            "შეკუმშვის ხარისხი. რაც უფრო მაღალია, მით უკეთესი."
                    },
                    bankOffset: {
                        title: "ბანკის წანაცვლება",
                        description:
                            "ფაილის საბანკო ოფსეტი. რეკომენდებულია 0-ის მნიშვნელობა. შეცვალეთ მხოლოდ იმ შემთხვევაში, თუ იცით, რას აკეთებთ."
                    },
                    adjust: {
                        title: "MIDI-ს რეგულირება,
                        description:
                            "MIDI ფაილის SoundFont-თან ადაპტირება. დატოვეთ ჩართული, თუ არ იცით რას აკეთებთ."
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "სათაური:",
                description: "სიმღერის სათაური"
            },
            album: {
                title: "ალბომი:",
                description: "სიმღერის ალბომი"
            },
            artist: {
                title: "შემსრულებელი:",
                description: "სიმღერის შემსრულებელი"
            },
            albumCover: {
                title: "ალბომის გარეკანი:",
                description: "სიმღერის ალბომის გარეკანი"
            },
            creationDate: {
                title: "შექმნილია:",
                description: "სიმღერის შექმნის თარიღი"
            },
            genre: {
                title: "ჟანრი:",
                description: "სიმღერის ჟანრი"
            },
            comment: {
                title: "კომენტარი:",
                description: "სიმღერის კომენტარი"
            },
            duration: {
                title: "ხანგრძლივობა:",
                description: "სიმღერის ხანგრძლივობა"
            },
            subject: {
                title: "თემა:",
                description: "სიმღერის თემა"
            },
            software: {
                title: "პროგრამული უზრუნველყოფა:",
                description: "სიმღერის დასაწერად გამოყენებული პროგრამა"
            }
        }
    }
};
