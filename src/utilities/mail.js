const nodemailer=require('nodemailer')  ;
const smtpTransport =require('nodemailer-smtp-transport') ;
// const sendmail=( reciever, subject, message ) => {
    const sendmail=( reciever, subject, message ) => {

     
    return new Promise((resolve,reject)=>{

    reciever = reciever.toString(); 
    const mailContent = "<center><table class='body-wrap' style='text-align:center;width:96%;font-family:arial,sans-serif;border:12px solid rgba(126, 122, 122, 0.08);border-spacing:4px 20px;'>\
            <tr>\
                <td>\
                    <center>\
                        <table bgcolor='#FFFFFF' width='90%'' border='0'>\
                            <tbody>\
                                <tr style='text-align:center;color:#575252;font-size:14px;'>\
                                    <td>\
                                        <span><h3>"+decodeURIComponent(message)+"<h3></span>\
                                    </td>\
                                </tr>\
                            </tbody>\
                        </table>\
                    </center>\
                </td>\
            </tr>\
        </table></center>";

       
    const smtpTranspo = nodemailer.createTransport(smtpTransport( {
        service: 'gmail',
        host: 'smtp.gmail.com',
        secure:false,
        auth:{
            user: 'chauhan1995sumit@gmail.com',
                pass: 'Sumit@12345'

    }
})

);
  
    var mailOptions = {
        from: 'chauhan1995sumit@gmail.com',
        to: reciever,
        subject: `${subject}`,
        generateTextFromHTML: true,
        html: mailContent
    }
  
    smtpTranspo.sendMail(mailOptions, function(error, response) {
  
        smtpTranspo.close();
        if(!error){
              resolve(true)
            
        }else{
              resolve(false);
            
        }
    });
})

  }


module.exports=   sendmail;