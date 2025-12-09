import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { User, Mail, Lock, MapPin, Phone, Building, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

function AddSellerPage() {
    const { addSeller, isSigningUp } = useAuthStore()
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        addresh: "",
        mobileNo: "",
        companyName: ""
    })

    const validateForm = () => {
        if (!formData.name.trim()) return toast.error('Name is required');
        if (!formData.email.trim()) return toast.error('Email is required');
        if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error('Invalid email format');
        if (!formData.password.trim()) return toast.error('Password is required');
        if (formData.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (!formData.addresh.trim()) return toast.error('Address is required');
        if (!formData.mobileNo.trim()) return toast.error('Mobile Number is required');
        if (formData.mobileNo.length !== 10) return toast.error('Mobile Number must be 10 digits');
        if (!formData.companyName.trim()) return toast.error('Company Name is required');

        return true;
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (validateForm()) {
            await addSeller(formData)
            // Optional: Reset form on success
            setFormData({
                name: "",
                email: "",
                password: "",
                addresh: "",
                mobileNo: "",
                companyName: ""
            })
        }
    }

    return (
        <div className='min-h-screen flex justify-center items-center p-4 pt-20 bg-base-200'>
            <div className='w-full max-w-md bg-base-100 rounded-lg shadow-xl p-8'>
                <div className='text-center mb-8'>
                    <h1 className='text-2xl font-bold'>Add New Seller</h1>
                    <p className='text-base-content/60'>Create a new seller account</p>
                </div>

                <form onSubmit={handleSubmit} className='space-y-4'>
                    {/* Name */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Full Name</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className='size-5 text-base-content/40' />
                            </div>
                            <input
                                type="text"
                                className={`input input-bordered w-full pl-10`}
                                placeholder="Seller Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Email</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className='size-5 text-base-content/40' />
                            </div>
                            <input
                                type="email"
                                className={`input input-bordered w-full pl-10`}
                                placeholder="seller@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Password</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className='size-5 text-base-content/40' />
                            </div>
                            <input
                                type="text"
                                className={`input input-bordered w-full pl-10`}
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Company Name */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Company Name</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building className='size-5 text-base-content/40' />
                            </div>
                            <input
                                type="text"
                                className={`input input-bordered w-full pl-10`}
                                placeholder="Company Name"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Mobile Number</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className='size-5 text-base-content/40' />
                            </div>
                            <input
                                type="text"
                                className={`input input-bordered w-full pl-10`}
                                placeholder="10-digit Mobile Number"
                                value={formData.mobileNo}
                                onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Address</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className='size-5 text-base-content/40' />
                            </div>
                            <textarea
                                className={`textarea textarea-bordered w-full pl-10`}
                                placeholder="Address"
                                value={formData.addresh}
                                onChange={(e) => setFormData({ ...formData, addresh: e.target.value })}
                            ></textarea>
                        </div>
                    </div>

                    <button type='submit' className='btn btn-primary w-full' disabled={isSigningUp}>
                        {isSigningUp ? (
                            <>
                                <Loader2 className='size-5 animate-spin' />
                                Adding Seller...
                            </>
                        ) : (
                            "Add Seller"
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AddSellerPage
