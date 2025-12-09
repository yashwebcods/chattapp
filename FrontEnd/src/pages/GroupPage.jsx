import React, { useEffect } from 'react'
import { useState } from 'react'
import { X, Loader2, MessageCircle } from 'lucide-react'
import { useMessageStore } from '../store/useMessageStore'
import { useSellerStore } from '../store/useSellerStore'

function Group() {
  const [close, setClose] = useState(false)
  const [creatingGroupId, setCreatingGroupId] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'withGroup', 'withoutGroup'
  const { setGroup, createGroup, setSelectedGroup, groups, getGroups } = useMessageStore()
  const { Sellers, getSeller } = useSellerStore()

  useEffect(() => {
    getSeller()
    getGroups()
  }, [])

  const handleCreateGroup = async (seller) => {
    setCreatingGroupId(seller._id)
    try {
      await createGroup({ sellerId: seller._id })
      await getSeller() // Refresh sellers to update group status
    } finally {
      setCreatingGroupId(null)
    }
  }

  const handleChatClick = (seller) => {
    // Find the group for this seller
    const group = groups.find(g => g.sellerId._id === seller._id)
    if (group) {
      setSelectedGroup(group)
      setGroup(false) // Close the group creation modal
    }
  }

  // Filter sellers based on selected filter
  const filteredSellers = Sellers.filter(seller => {
    if (filter === 'withGroup') return seller.hasGroup
    if (filter === 'withoutGroup') return !seller.hasGroup
    return true // 'all'
  })

  return (

    <div className='bg-base-100 rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-8rem)]'>
      <div className='flex justify-between  border-b py-4 px-3 border-base-300 '>
        <div>Create Group With Seller</div>
        <button onClick={(e) => {
          setClose(!close)
          setGroup(close)
        }}>
          <X />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-3 border-b border-base-300">
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('all')}
        >
          All Seller
        </button>
        <button
          className={`btn btn-sm ${filter === 'withGroup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('withGroup')}
        >
          With Group
        </button>
        <button
          className={`btn btn-sm ${filter === 'withoutGroup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('withoutGroup')}
        >
          Without Group
        </button>
      </div>

      <div>
        <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
          <table className="table">
            {/* head */}
            <thead>
              <tr>
                <th>Index</th>
                <th>Name</th>
                <th>Company Name</th>
                <th>Addresh</th>
                <th>Mobile no</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {
                filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <p className="text-base-content/60">
                        {filter === 'withGroup' ? 'No sellers with groups found.' :
                          filter === 'withoutGroup' ? 'No sellers without groups found.' :
                            'No sellers found. Please add a seller first.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((v, i) => {
                    return <tr className='w-full' key={i}>
                      <th><span className='text-xs font-bold'>{i + 1}</span></th>
                      <td><span className='text-xs font-light'>{v.name}</span></td>
                      <td><span className='text-xs font-light'>{v.companyName}</span></td>
                      <td><span className='text-xs font-light'>{v.addresh}</span></td>
                      <td><span className='text-xs font-light'>{v.mobileNo}</span></td>
                      <td>
                        {v.hasGroup ? (
                          <button
                            className='btn btn-sm btn-success text-white gap-2'
                            onClick={() => handleChatClick(v)}
                          >
                            <MessageCircle className="size-4" />
                            Chat
                          </button>
                        ) : (
                          <button
                            className='btn btn-sm'
                            onClick={() => handleCreateGroup(v)}
                            disabled={creatingGroupId === v._id}
                          >
                            {creatingGroupId === v._id ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create Group'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  })
                )
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Group