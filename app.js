const axios = require("axios");
const express = require('express');
const AWS= require("aws-sdk");
const PDFDocument = require('pdf-lib').PDFDocument
const fs = require('fs')
const app = express();

app.get('/',async(req, res)=>{
  res.send({Message: "I am healthy"});
})

app.get('/checkfile',async(req, res)=>{
    var resultssArray = [];
        if (Math.floor(new Date().getTime() / 1000) - req.query.date > 604800)
        {
            res.send({Message : "Link expired"});
        }else {
                try {
                    let pdfname = req.query.id+'-'+req.query.date+'.pdf';
                       AWS.config.update({
                            accessKeyId: process.env.ACCESSKEYID,
                            secretAccessKey: process.env.SECRETACCESSKEY,
                            region: process.env.REGION
                       });
                       const s3 = new AWS.S3();

                       s3.getObject(
                                      { Bucket: "testvajra", Key: pdfname },
                                      async function (error, data)
                                      {
                                        if (error != null)
                                        {
                                                  try{
                                                      const aa = await axios("https://app.meltwater.com/api/public/newsletters/"+req.query.company_id+"/newsletter/"+req.query.id+"/latest");
                                                     console.log(aa.data)

                                                      let characteristics = aa.data.indexOf(req.query.id+"&&date="+req.query.date);

                                                      if(!characteristics)
                                                        {
                                                            res.send("Loading failed, please try again later.");
                                                        }
                                                        else {
                                                          console.log("Loading, please wait..");
                                                      }

                                                     const patternResults = aa.data.match(/print_clip_previewer%2F(.*?)%/g);
                                                        // console.log(patternResults.length)
                                                              let k=0;
                                                              for (const element of patternResults) {
                                                                  console.log(element.slice(23,-1), k++);

                                                                      const options = {
                                                                                method: 'GET',
                                                                                url: 'http://meltwaternews.com/ext/mediac/'+element.slice(23,-1)+'.pdf',
                                                                                responseType: "arraybuffer"
                                                                            };
                                                                            let results = await axios.request(options).then(function (response) {
                                                                                res.header('Content-Type', 'application/pdf');
                                                                                return response.data;
                                                                            }).catch(function (error) {
                                                                                console.error("File not received from Mediac/Not Exist");
                                                                            });

                                                                            if(results){
                                                                                const params = {
                                                                                            Bucket: "testvajra",
                                                                                            Key: "tmp/"+element.slice(23,-1)+".pdf"
                                                                                    }
                                                                                        try {
                                                                                                await s3.headObject(params).promise()
                                                                                                console.log("File Found in S3 Temp")
                                                                                            } catch (err) {
                                                                                                resultssArray.push(results)
                                                                                        }
                                                                            }

                                                                }

                                                 const mergedPdf = await PDFDocument.create();
                                                    for (const pdfBytes of resultssArray) {
                                                        try {
                                                        const pdf = await PDFDocument.load(pdfBytes);
                                                        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                                                        copiedPages.forEach((page) => {
                                                            try {
                                                                mergedPdf.addPage(page);
                                                            }catch (e) {
                                                                console.log("Error In Merging page")
                                                            }
                                                        })
                                                        }catch (e) {
                                                            console.log("Error In Loading Bytes")
                                                        }

                                                    }
                                                    try {
                                                        const buf = await mergedPdf.save();        // Uint8Array
                                                    let path = 'final.pdf';
                                                    fs.open(path, 'w', function (err, fd) {
                                                        try {
                                                            fs.write(fd, buf, 0, buf.length, null, function (err) {
                                                                try {
                                                                        fs.close(fd, function () {
                                                                            console.log('wrote the file successfully');
                                                                            const data =fs.readFileSync('./final.pdf');
                                                                            res.contentType("application/pdf");
                                                                            res.send(data);
                                                                            // res.download("final.pdf")
                                                                        });
                                                                }catch (e) {
                                                                    console.log("Failed to Close")
                                                                }
                                                            });
                                                        }catch (e) {
                                                             console.log("Failed to Write")
                                                        }
                                                    })
                                                    }catch (e) {
                                                        console.log("Failed to Open")
                                                    }
                                                    console.log("Success");
                                                  }catch (err){
                                                      res.send("Newsletter id is not valid")
                                                  }


                                        } else {
                                                  res.contentType("application/pdf");
                                                  res.send(data.Body);
                                               }
                                       }
                                    );
                } catch (err) {
                    res.send("Failed to retrieve");
                }
              }


})

const port = process.env.port || 3000;
app.listen(port, ()=>{
  console.log(`Server is running on ` + port)
})





