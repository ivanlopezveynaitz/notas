const passport = require("passport");
const localStrategy = require('passport-local').Strategy;

//Importamos el modelo de datos
const Usuario = require('../model/Users');

passport.use(new localStrategy(
    {
        usernameField: 'email'
    },
    //done es la variable donde regresamos la información
    //de la auenticación
    async function (email, password, done){
        const usuario = await Usuario.findOne({email: email});
        if (!usuario){
            //null significa que no hay ningún error
            //false indica que no se encontró el usuario en la db
            return done(null, false, {message: 'No se encontró el usuario'})
        } else {
            //comprobamos que la contraseña del usuario coincida con la almacenada en la db
            const coincide = await usuario.matchPassword(password);
            if(coincide){
                //null indica que no hay ningún error
                //user indica que encontro un usuario con el email indicado
                //y que coincide con el password envuado
                return done(null, usuario)
            } else{
                //La contraseña es incorrecta
                console.log('contraseña incorrecta');
                return done(null,false, {message:'Password incorecto'})
            }//Fin de else
        }//Fin de else
    }//fin de async function
));//Fin de passport.use

passport.serializeUser( (usuario,done)=>{   
    done(null, usuario._id);
});

passport.deserializeUser( (id, done)=>{
    Usuario.findById(id)
           .then( (usuario)=>{
                //console.log(usuario);
                done(null,usuario);
            })
           .catch( (err)=>{
               console.log(err);
               done(err, null)
           })   
});
