import Seller from '../Models/seller.model.js'
import User from '../Models/user.model.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

export const addseller = async (req, res) => {
    try {

        // get data from req.body
        const { name, email, password, addresh, mobileNo, companyName } = req.body

        if (!name || !email || !password || !addresh || !mobileNo) {
            return res.status(400).json({ message: "All fields required" });
        }

        // is seller exsit
        let isExist = await Seller.findOne({ email, name })
        if (isExist) {
            return res.status(400).json({ Message: "User already exists" })
        }

        // for user set us createdby
        let creatorData = req.cookies.jwt;
        let decoded = jwt.verify(creatorData, process.env.jwt_secret)
        let useData = await User.findById(decoded.userId);

        // hash seller signup password
        let hashPassword = await bcrypt.hash(password, 10);


        let addSeller = new Seller({
            name,
            email,
            createdBy: useData.email,
            password: hashPassword,
            addresh,
            mobileNo,
            companyName
        });

        let isadded = await addSeller.save()

        if (isadded) {
            return res.status(201).json({ message: 'seller addeded sucessfully' })
        }

    } catch (error) {
        console.error('Error in signup SellerCtl : ', error.message);
        return res.status(500).json({ error: error.message })
    }
}

export const getSeller = async (req, res) => {
    try {
        const Group = (await import('../Models/group.model.js')).default;

        const allSeller = await Seller.find({})

        // For each seller, check if they have a group
        const sellersWithGroupInfo = await Promise.all(
            allSeller.map(async (seller) => {
                const group = await Group.findOne({ sellerId: seller._id });
                return {
                    ...seller.toObject(),
                    hasGroup: !!group,
                    groupId: group?._id || null
                };
            })
        );

        if (sellersWithGroupInfo) {
            return res.status(201).json({ message: 'Seller data fetched', allSeller: sellersWithGroupInfo })
        } else {
            return res.status(400).json({ message: 'Seller Data not fetched' })
        }
    } catch (error) {
        console.error('Error in getSeller : ', error.message);
        return res.status(500).json({ error: error.message })
    }
}