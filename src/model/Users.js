const mongoose= require('mongoose');
const { Schema } = mongoose;
const bcryptjs = require('bcryptjs');

const UserSchema = new Schema({
    nombre: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type:String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    tipo: {
        type: Number,
        default: 1     //0 - Usuario administrador, 1- Usuario regular
    }
});

UserSchema.method({
    //Función que encripta un password 10 veces y retorna el password encriptado
    async encryptPassword( password){
        const passwordHash = await bcryptjs.hash(password, 10);
        return passwordHash;
    },

    //Función que toma la contraseña y la compara contra la que está en la DB
    async matchPassword( password){
        return await bcryptjs.compare(password, this.password); 
    }
}); //Fin de method

module.exports = mongoose.model('User', UserSchema);




