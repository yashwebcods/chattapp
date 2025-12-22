import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'chat_files';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Bucket:', bucketName);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
    try {
        // Test 1: Check if bucket exists
        console.log('\n1. Checking if bucket exists...');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        if (bucketsError) {
            console.error('❌ Error listing buckets:', bucketsError);
            return;
        }

        console.log('✅ Available buckets:', buckets.map(b => b.name));
        const bucketExists = buckets.some(b => b.name === bucketName);
        console.log(`Bucket "${bucketName}" exists:`, bucketExists);

        if (!bucketExists) {
            console.log('\n⚠️ Bucket does not exist. Creating bucket...');
            const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 20971520 // 20MB
            });

            if (createError) {
                console.error('❌ Error creating bucket:', createError);
                return;
            }
            console.log('✅ Bucket created successfully');
        }

        // Test 2: Try uploading a test file
        console.log('\n2. Testing file upload...');
        const testData = Buffer.from('This is a test file', 'utf-8');
        const testPath = `test_${Date.now()}.txt`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(testPath, testData, {
                contentType: 'text/plain',
                upsert: false
            });

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            return;
        }

        console.log('✅ File uploaded successfully:', uploadData);

        // Test 3: Get public URL
        console.log('\n3. Getting public URL...');
        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(testPath);

        console.log('✅ Public URL:', publicUrlData.publicUrl);

        // Test 4: Delete test file
        console.log('\n4. Cleaning up test file...');
        const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([testPath]);

        if (deleteError) {
            console.error('❌ Delete error:', deleteError);
        } else {
            console.log('✅ Test file deleted');
        }

        console.log('\n✅ All tests passed! Supabase is configured correctly.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

testSupabase();
